import { and, eq } from 'drizzle-orm';

import { cardTags, cards, db, notes, noteTags, tags } from '@/lib/db';
import { renderMarkdown, toPlainText } from '@/lib/markdown';

import { itemKey, type Item } from './types';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

function tagsBy(rows: { owner: number; name: string }[]) {
  const byOwner = new Map<number, string[]>();
  for (const { owner, name } of rows) {
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), name]);
  }
  for (const names of byOwner.values()) {
    names.sort();
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
  const [cardRows, noteRows, cardTagRows, noteTagRows] = await Promise.all([
    db.select().from(cards).where(eq(cards.userId, userId)),
    db.select().from(notes).where(eq(notes.userId, userId)),
    db
      .select({ owner: cardTags.cardId, name: tags.name })
      .from(cardTags)
      .innerJoin(tags, eq(tags.id, cardTags.tagId))
      .innerJoin(cards, eq(cards.id, cardTags.cardId))
      .where(and(eq(cards.userId, userId), eq(tags.userId, userId))),
    db
      .select({ owner: noteTags.noteId, name: tags.name })
      .from(noteTags)
      .innerJoin(tags, eq(tags.id, noteTags.tagId))
      .innerJoin(notes, eq(notes.id, noteTags.noteId))
      .where(and(eq(notes.userId, userId), eq(tags.userId, userId))),
  ]);

  const cardTagNames = tagsBy(cardTagRows);
  const noteTagNames = tagsBy(noteTagRows);

  const fromCards = cardRows.map((card): Item => {
    const touched = card.updatedAt ?? card.createdAt;
    return {
      key: itemKey('card', card.id),
      id: card.id,
      type: 'card',
      title: toPlainText(card.front),
      body: toPlainText(card.back),
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
