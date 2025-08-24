import { describe, it, expect } from 'vitest';
import { FlashcardNode } from './flashcard-node.js';

describe('FlashcardNode', () => {
  it('initializes review fields on create', () => {
    const card = FlashcardNode.create({
      isPublic: false,
      data: { front: 'front', back: 'back' },
    });
    expect(card.data.repetitions).toBe(0);
    expect(card.data.interval).toBe(0);
    expect(card.data.easeFactor).toBe(2.5);
    expect(card.data.lastReviewedAt).toBeNull();
  });

  it('updates scheduling on review', () => {
    const card = FlashcardNode.create({
      isPublic: false,
      data: { front: 'q', back: 'a' },
    });
    const reviewed = card.review(5);
    expect(reviewed.data.repetitions).toBe(1);
    expect(reviewed.data.interval).toBe(1);
    expect(reviewed.data.dueAt.getTime()).toBeGreaterThan(
      card.data.dueAt.getTime()
    );
    expect(reviewed.data.lastReviewedAt).not.toBeNull();
  });
});
