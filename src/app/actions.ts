'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { cards, db, decks, reviews } from '@/lib/db';
import { normalizeMarkdown } from '@/lib/markdown';
import { review, type Grade } from '@/lib/srs';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

/**
 * Editing is reachable from the deck list and mid-drill, and should return you
 * to wherever you came from — but that destination arrives in a form field, so
 * it is only honoured when it is a path on this site. `//evil.com` is a valid
 * relative-looking URL that browsers treat as protocol-relative, hence the
 * second check.
 */
function safeReturnTo(value: FormDataEntryValue | null, fallback: string) {
  const path = String(value ?? '');
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}

export async function createDeck(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();

  if (!name) {
    redirect('/?error=Give+the+deck+a+name');
  }

  const [deck] = await db
    .insert(decks)
    .values({ name })
    .returning({ id: decks.id });

  revalidatePath('/');
  redirect(`/decks/${deck.id}`);
}

export async function createCard(formData: FormData) {
  const deckId = Number(formData.get('deckId'));
  const front = normalizeMarkdown(String(formData.get('front') ?? ''));
  const back = normalizeMarkdown(String(formData.get('back') ?? ''));

  if (!deckId) {
    redirect('/');
  }

  if (!front || !back) {
    redirect(`/decks/${deckId}/new?error=Both+sides+are+required`);
  }

  await db.insert(cards).values({ deckId, front, back });

  revalidatePath('/');
  revalidatePath(`/decks/${deckId}`);
  revalidatePath('/drill');
  // The timestamp makes each save a distinct URL, so the client-side
  // "card added" notice remounts and fades in again.
  redirect(`/decks/${deckId}/new?added=${Date.now()}`);
}

export async function updateCard(formData: FormData) {
  const cardId = Number(formData.get('cardId'));
  const deckId = Number(formData.get('deckId'));
  const front = normalizeMarkdown(String(formData.get('front') ?? ''));
  const back = normalizeMarkdown(String(formData.get('back') ?? ''));
  const returnTo = safeReturnTo(formData.get('returnTo'), `/decks/${deckId}`);

  if (!cardId || !deckId) {
    redirect('/');
  }

  if (!front || !back) {
    redirect(
      `/decks/${deckId}/cards/${cardId}/edit?error=Both+sides+are+required`,
    );
  }

  // Only the text and its edit stamp: a card's scheduling is the review
  // history's business, and fixing a typo is not a review.
  await db
    .update(cards)
    .set({ front, back, updatedAt: new Date() })
    .where(eq(cards.id, cardId));

  revalidatePath('/');
  revalidatePath(`/decks/${deckId}`);
  revalidatePath('/drill');
  redirect(returnTo);
}

export async function gradeCard(formData: FormData) {
  const cardId = Number(formData.get('cardId'));
  const grade = String(formData.get('grade'));

  if (!cardId || !GRADES.includes(grade as Grade)) {
    return;
  }

  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    return;
  }

  const next = review(card, grade as Grade);

  // Update current state and append to the history log atomically.
  await db.batch([
    db.update(cards).set(next).where(eq(cards.id, cardId)),
    db.insert(reviews).values({
      cardId,
      reviewedAt: next.lastReviewedAt,
      grade: grade as Grade,
      dueAt: next.dueAt,
      intervalRaw: next.intervalRaw,
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
    }),
  ]);

  revalidatePath('/');
  revalidatePath(`/decks/${card.deckId}`);
  revalidatePath('/drill');
}
