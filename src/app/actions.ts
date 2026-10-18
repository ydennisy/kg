'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { refresh } from 'next/cache';

import { requireUser } from '@/lib/auth';
import { cards, cardTags, db, notes, noteTags, reviews, tags } from '@/lib/db';
import {
  domain,
  draftProblem,
  normalizeTag,
  normalizeUrl,
} from '@/lib/knowledge/draft';
import { itemKey, type ItemDraft, type ItemType } from '@/lib/knowledge/types';
import { enrichLink } from '@/lib/links/enrich';
import { normalizeMarkdown } from '@/lib/markdown';
import { review, type Grade } from '@/lib/srs';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

export type SaveResult =
  { ok: true; key: string } | { ok: false; error: string };

/** Ids for these tag names, creating the ones that do not exist yet. */
async function tagIds(userId: string, names: string[]): Promise<number[]> {
  const wanted = [...new Set(names.map(normalizeTag).filter(Boolean))];
  if (wanted.length === 0) {
    return [];
  }
  await db
    .insert(tags)
    .values(wanted.map((name) => ({ name, userId })))
    .onConflictDoNothing();
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, wanted)));
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
  const user = await requireUser();
  const problem = draftProblem(draft);
  if (problem) {
    return { ok: false, error: problem };
  }
  if (editing && (editing.type === 'card') !== (draft.type === 'card')) {
    return { ok: false, error: 'A card cannot become a note, or the reverse' };
  }

  // Check ownership before creating tags or changing any related rows.
  if (editing) {
    const table = editing.type === 'card' ? cards : notes;
    const [existing] = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, editing.id), eq(table.userId, user.id)));
    if (!existing) return { ok: false, error: 'Item not found' };
  }
  const ids = await tagIds(user.id, draft.tags);
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
        .where(and(eq(cards.id, cardId), eq(cards.userId, user.id)));
      await db.delete(cardTags).where(eq(cardTags.cardId, cardId));
    } else {
      [{ id: cardId }] = await db
        .insert(cards)
        .values({ ...text, userId: user.id })
        .returning({ id: cards.id });
    }
    if (ids.length) {
      await db.insert(cardTags).values(ids.map((tagId) => ({ cardId, tagId })));
    }
    key = itemKey('card', cardId);
  } else {
    const url = draft.type === 'link' ? normalizeUrl(draft.a)! : null;
    const [previous] = editing
      ? await db
          .select()
          .from(notes)
          .where(and(eq(notes.id, editing.id), eq(notes.userId, user.id)))
      : [];
    const metadata =
      url && (previous?.kind !== 'link' || previous.url !== url)
        ? await enrichLink(url)
        : {
            title: '',
            summary: previous?.summary ?? '',
            keywords: previous?.keywords ?? '',
          };
    const values =
      draft.type === 'link'
        ? {
            kind: 'link' as const,
            url,
            title: draft.b.trim() || metadata.title || domain(url!),
            summary: metadata.summary,
            keywords: metadata.keywords,
            body: normalizeMarkdown(draft.c),
          }
        : {
            kind: 'note' as const,
            url: null,
            summary: '',
            keywords: '',
            title: draft.a.trim(),
            body: normalizeMarkdown(draft.b),
          };
    let noteId: number;
    if (editing) {
      noteId = editing.id;
      await db
        .update(notes)
        .set({ ...values, updatedAt: now })
        .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));
      await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
    } else {
      [{ id: noteId }] = await db
        .insert(notes)
        .values({ ...values, userId: user.id })
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
  const user = await requireUser();
  const table = type === 'card' ? cards : notes;
  const [owned] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, user.id)));
  if (!owned) return;
  // The schema cascades these, but only on a connection with foreign keys
  // switched on — so the dependent rows go explicitly, in the same batch.
  if (type === 'card') {
    await db.batch([
      db.delete(reviews).where(eq(reviews.cardId, id)),
      db.delete(cardTags).where(eq(cardTags.cardId, id)),
      db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id))),
    ]);
  } else {
    const [note] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(eq(notes.id, id), eq(notes.kind, type), eq(notes.userId, user.id)),
      );
    if (!note) {
      return;
    }
    await db.batch([
      db.delete(noteTags).where(eq(noteTags.noteId, id)),
      db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))),
    ]);
  }
  refresh();
}

export async function gradeCard(cardId: number, grade: Grade) {
  const user = await requireUser();
  if (!Number.isInteger(cardId) || !GRADES.includes(grade)) {
    return;
  }

  const [card] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, user.id)));
  if (!card) {
    return;
  }

  const next = review(card, grade);

  // Update current state and append to the history log atomically.
  await db.batch([
    db
      .update(cards)
      .set(next)
      .where(and(eq(cards.id, cardId), eq(cards.userId, user.id))),
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
