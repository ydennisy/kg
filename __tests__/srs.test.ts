import { describe, expect, test } from 'vitest';

import { review, type ReviewState } from '@/lib/srs';

const now = new Date('2026-01-01T12:00:00Z');
const learning: ReviewState = {
  intervalRaw: 0,
  intervalDays: 0,
  easeFactor: 2.5,
  reps: 0,
  lapses: 0,
};
const graduated: ReviewState = {
  intervalRaw: 10,
  intervalDays: 10,
  easeFactor: 2.5,
  reps: 3,
  lapses: 0,
};

const minutesUntil = (date: Date) => (date.getTime() - now.getTime()) / 60_000;
const daysUntil = (date: Date) => (date.getTime() - now.getTime()) / 86_400_000;

describe('review', () => {
  test('a learning card graduates to 1 day on good, 4 days on easy', () => {
    expect(review(learning, 'good', now).intervalDays).toBe(1);
    expect(review(learning, 'easy', now).intervalDays).toBe(4);
    expect(daysUntil(review(learning, 'good', now).dueAt)).toBe(1);
  });

  test('a graduated card multiplies its interval by grade', () => {
    expect(review(graduated, 'hard', now).intervalDays).toBe(12); // 10 * 1.2
    expect(review(graduated, 'good', now).intervalDays).toBe(25); // 10 * 2.5
    expect(review(graduated, 'easy', now).intervalDays).toBe(34); // 10 * 2.65 * 1.3
  });

  test('the unrounded interval keeps repeated hard answers creeping up', () => {
    // 1 * 1.2 rounds back to 1 day; the raw value is what escapes the round.
    let state: ReviewState = { ...graduated, intervalRaw: 1, intervalDays: 1 };
    const days: number[] = [];
    for (let i = 0; i < 6; i++) {
      state = review(state, 'hard', now);
      days.push(state.intervalDays);
    }
    expect(days).toEqual([1, 1, 2, 2, 2, 3]);
    expect(state.intervalRaw).toBeCloseTo(2.986);
  });

  test('ease moves by grade and never drops below 1.3', () => {
    expect(review(graduated, 'again', now).easeFactor).toBeCloseTo(2.3);
    expect(review(graduated, 'hard', now).easeFactor).toBeCloseTo(2.35);
    expect(review(graduated, 'good', now).easeFactor).toBeCloseTo(2.5);
    expect(review(graduated, 'easy', now).easeFactor).toBeCloseTo(2.65);

    let state: ReviewState = { ...graduated, easeFactor: 1.4 };
    for (let i = 0; i < 5; i++) state = review(state, 'again', now);
    expect(state.easeFactor).toBe(1.3);
  });

  test('again sends a graduated card back to relearning and counts a lapse', () => {
    const next = review(graduated, 'again', now);
    expect(next).toMatchObject({ intervalDays: 0, reps: 0, lapses: 1 });
    expect(minutesUntil(next.dueAt)).toBe(10);
  });

  test('hard repeats the step while learning, without counting a lapse', () => {
    const next = review(learning, 'hard', now);
    expect(next).toMatchObject({ intervalDays: 0, reps: 0, lapses: 0 });
    expect(minutesUntil(next.dueAt)).toBe(10);
  });

  test('a card that never graduated does not lapse', () => {
    expect(review(learning, 'again', now).lapses).toBe(0);
  });

  test('every review stamps when it happened', () => {
    expect(review(learning, 'good', now).lastReviewedAt).toEqual(now);
    expect(review(graduated, 'again', now).lastReviewedAt).toEqual(now);
  });
});
