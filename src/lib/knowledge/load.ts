import { eq } from 'drizzle-orm';

import { cardTags, cards, db, notes, noteTags, tags } from '@/lib/db';
import { renderMarkdown, toPlainText } from '@/lib/markdown';

import { tagPaths, withoutImplied } from './tags';
import { itemKey, type Item } from './types';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

function tagsBy(
  rows: { owner: number; tagId: number }[],
  paths: Map<number, string>,
) {
  const byOwner = new Map<number, string[]>();
  for (const { owner, tagId } of rows) {
    const path = paths.get(tagId);
    if (path) {
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), path]);
    }
  }
  for (const [owner, names] of byOwner) {
    byOwner.set(owner, withoutImplied(names));
  }
  return byOwner;
}

/**
 * Every card, note and link, rendered and ready to search in the browser. A
 * personal knowledge base is small enough that sending all of it beats a
 * round trip per keystroke, and it lets results update as you type.
 */
export async function loadItems(
  userId: string,
  now: Date = new Date(),
): Promise<Item[]> {
  const [cardRows, noteRows, tagRows, cardTagRows, noteTagRows] =
    await Promise.all([
      db.select().from(cards).where(eq(cards.userId, userId)),
      db.select().from(notes).where(eq(notes.userId, userId)),
      db
        .select({ id: tags.id, parentId: tags.parentId, name: tags.name })
        .from(tags)
        .where(eq(tags.userId, userId)),
      db
        .select({ owner: cardTags.cardId, tagId: cardTags.tagId })
        .from(cardTags)
        .innerJoin(cards, eq(cards.id, cardTags.cardId))
        .where(eq(cards.userId, userId)),
      db
        .select({ owner: noteTags.noteId, tagId: noteTags.tagId })
        .from(noteTags)
        .innerJoin(notes, eq(notes.id, noteTags.noteId))
        .where(eq(notes.userId, userId)),
    ]);

  // Only this user's tags have paths, so a link to anyone else's drops out.
  const paths = tagPaths(tagRows);
  const cardTagNames = tagsBy(cardTagRows, paths);
  const noteTagNames = tagsBy(noteTagRows, paths);

  const fromCards = cardRows.map((card): Item => {
    const touched = card.updatedAt ?? card.createdAt;
    return {
      key: itemKey('card', card.id),
      id: card.id,
      type: 'card',
      title: toPlainText(card.front),
      body: toPlainText(card.back),
      summary: '',
      keywords: '',
      titleMarkdown: card.front,
      bodyMarkdown: card.back,
      titleHtml: renderMarkdown(card.front),
      bodyHtml: renderMarkdown(card.back),
      url: null,
      tags: cardTagNames.get(card.id) ?? [],
      touchedAt: touched.getTime(),
      date: dateFormat.format(touched),
      due: card.dueAt.getTime() <= now.getTime(),
    };
  });

  const fromNotes = noteRows.map((note): Item => {
    const touched = note.updatedAt ?? note.createdAt;
    return {
      key: itemKey(note.kind, note.id),
      id: note.id,
      type: note.kind,
      // Titles are plain text; only the body is markdown.
      title: note.title,
      body: toPlainText(note.body),
      summary: note.summary,
      keywords: note.keywords,
      titleMarkdown: note.title,
      bodyMarkdown: note.body,
      titleHtml: '',
      bodyHtml: note.body ? renderMarkdown(note.body) : '',
      url: note.url,
      tags: noteTagNames.get(note.id) ?? [],
      touchedAt: touched.getTime(),
      date: dateFormat.format(touched),
      due: false,
    };
  });

  return [...fromCards, ...fromNotes];
}
