'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { cards, db, decks, reviews } from '@/lib/db';
import { review, type Grade } from '@/lib/srs';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

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
  const front = String(formData.get('front') ?? '').trim();
  const back = String(formData.get('back') ?? '').trim();

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
