'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { refresh } from 'next/cache';

import { cards, cardTags, db, notes, noteTags, reviews, tags } from '@/lib/db';
import {
  domain,
  draftProblem,
  normalizeTag,
  normalizeUrl,
} from '@/lib/knowledge/draft';
import { itemKey, type ItemDraft, type ItemType } from '@/lib/knowledge/types';
import { normalizeMarkdown } from '@/lib/markdown';
import { review, type Grade } from '@/lib/srs';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

export type SaveResult =
  { ok: true; key: string } | { ok: false; error: string };

/** Ids for these tag names, creating the ones that do not exist yet. */
async function tagIds(names: string[]): Promise<number[]> {
  const wanted = [...new Set(names.map(normalizeTag).filter(Boolean))];
  if (wanted.length === 0) {
    return [];
  }
  await db
    .insert(tags)
    .values(wanted.map((name) => ({ name })))
    .onConflictDoNothing();
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.name, wanted));
  return rows.map((row) => row.id);
}

/**
 * Adds a card, note or link — or, with `editing`, changes one. A card's type
 * is fixed once it exists: it has a review history a note could not carry.
 * Editing a card never touches its schedule; fixing a typo is not a review.
 */
export async function saveItem(
  draft: ItemDraft,
  editing: { type: ItemType; id: number } | null = null,
): Promise<SaveResult> {
  const problem = draftProblem(draft);
  if (problem) {
    return { ok: false, error: problem };
  }
  if (editing && (editing.type === 'card') !== (draft.type === 'card')) {
    return { ok: false, error: 'A card cannot become a note, or the reverse' };
  }

  const ids = await tagIds(draft.tags);
  const now = new Date();
  let key: string;

  if (draft.type === 'card') {
    const text = {
      front: normalizeMarkdown(draft.a),
      back: normalizeMarkdown(draft.b),
    };
    let cardId: number;
    if (editing) {
      cardId = editing.id;
      await db
        .update(cards)
        .set({ ...text, updatedAt: now })
        .where(eq(cards.id, cardId));
      await db.delete(cardTags).where(eq(cardTags.cardId, cardId));
    } else {
      [{ id: cardId }] = await db
        .insert(cards)
        .values(text)
        .returning({ id: cards.id });
    }
    if (ids.length) {
      await db.insert(cardTags).values(ids.map((tagId) => ({ cardId, tagId })));
    }
    key = itemKey('card', cardId);
  } else {
    const url = draft.type === 'link' ? normalizeUrl(draft.a)! : null;
    const values =
      draft.type === 'link'
        ? {
            kind: 'link' as const,
            url,
            title: draft.b.trim() || domain(url!),
            body: normalizeMarkdown(draft.c),
          }
        : {
            kind: 'note' as const,
            url: null,
            title: draft.a.trim(),
            body: normalizeMarkdown(draft.b),
          };
    let noteId: number;
    if (editing) {
      noteId = editing.id;
      await db
        .update(notes)
        .set({ ...values, updatedAt: now })
        .where(eq(notes.id, noteId));
      await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
    } else {
      [{ id: noteId }] = await db
        .insert(notes)
        .values(values)
        .returning({ id: notes.id });
    }
    if (ids.length) {
      await db.insert(noteTags).values(ids.map((tagId) => ({ noteId, tagId })));
    }
    key = itemKey(draft.type, noteId);
  }

  refresh();
  return { ok: true, key };
}

export async function deleteItem(type: ItemType, id: number) {
  // The schema cascades these, but only on a connection with foreign keys
  // switched on — so the dependent rows go explicitly, in the same batch.
  if (type === 'card') {
    await db.batch([
      db.delete(reviews).where(eq(reviews.cardId, id)),
      db.delete(cardTags).where(eq(cardTags.cardId, id)),
      db.delete(cards).where(eq(cards.id, id)),
    ]);
  } else {
    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.kind, type)));
    if (!note) {
      return;
    }
    await db.batch([
      db.delete(noteTags).where(eq(noteTags.noteId, id)),
      db.delete(notes).where(eq(notes.id, id)),
    ]);
  }
  refresh();
}

export async function gradeCard(cardId: number, grade: Grade) {
  if (!Number.isInteger(cardId) || !GRADES.includes(grade)) {
    return;
  }

  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    return;
  }

  const next = review(card, grade);

  // Update current state and append to the history log atomically.
  await db.batch([
    db.update(cards).set(next).where(eq(cards.id, cardId)),
    db.insert(reviews).values({
      cardId,
      reviewedAt: next.lastReviewedAt,
      grade,
      dueAt: next.dueAt,
      intervalRaw: next.intervalRaw,
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
    }),
  ]);

  refresh();
}
