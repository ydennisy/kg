export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type ReviewState = {
  /** Unrounded interval the scheduler multiplies, in days. */
  intervalRaw: number;
  /** What `intervalRaw` rounds to for the due date. */
  intervalDays: number;
  easeFactor: number;
  reps: number;
  lapses: number;
};

export type ReviewResult = ReviewState & { dueAt: Date; lastReviewedAt: Date };

// Anki's SM-2 defaults.
const MIN_EASE_FACTOR = 1.3;
const EASE_DELTA: Record<Grade, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};
const RELEARN_DELAY_MINUTES = 10;
const GRADUATING_INTERVAL_DAYS = 1;
const EASY_INTERVAL_DAYS = 4;
const HARD_MULTIPLIER = 1.2;
const EASY_BONUS = 1.3;

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * Anki's four-button take on SM-2.
 * Pure on purpose: no clock, no db, so it can be unit tested.
 */
export function review(
  state: ReviewState,
  grade: Grade,
  now: Date = new Date(),
): ReviewResult {
  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + EASE_DELTA[grade],
  );

  // `again` always drops the card back into (re)learning. `hard` repeats the
  // current step while the card is still learning rather than graduating it.
  const learning = state.reps === 0;
  if (grade === 'again' || (grade === 'hard' && learning)) {
    return {
      intervalRaw: 0,
      intervalDays: 0,
      easeFactor,
      reps: 0,
      // Only a card that had graduated can lapse.
      lapses: grade === 'again' && !learning ? state.lapses + 1 : state.lapses,
      dueAt: new Date(now.getTime() + RELEARN_DELAY_MINUTES * MINUTE),
      lastReviewedAt: now,
    };
  }

  const reps = state.reps + 1;

  let intervalRaw: number;
  if (learning) {
    intervalRaw =
      grade === 'easy' ? EASY_INTERVAL_DAYS : GRADUATING_INTERVAL_DAYS;
  } else if (grade === 'hard') {
    intervalRaw = state.intervalRaw * HARD_MULTIPLIER;
  } else if (grade === 'easy') {
    intervalRaw = state.intervalRaw * easeFactor * EASY_BONUS;
  } else {
    intervalRaw = state.intervalRaw * easeFactor;
  }

  // Only the due date rounds. `intervalRaw` carries the exact value into the
  // next review, so repeated `hard` answers still creep upwards instead of
  // rounding back to the same day forever.
  const intervalDays = Math.max(1, Math.round(intervalRaw));

  return {
    intervalRaw,
    intervalDays,
    easeFactor,
    reps,
    lapses: state.lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY),
    lastReviewedAt: now,
  };
}
