import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ReviewFlashcardAnswerUseCase } from './review-flashcard-answer.js';
import type { FlashcardAnswerGrader } from '../ports/flashcard-answer-grader.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { FlashcardNode } from '../../domain/flashcard-node.js';
import { assertOk } from '../../../test/assert.js';

describe('ReviewFlashcardAnswerUseCase', () => {
  let grader: FlashcardAnswerGrader;
  let repository: NodeRepository;
  let useCase: ReviewFlashcardAnswerUseCase;
  let card: FlashcardNode;

  beforeEach(() => {
    grader = { evaluate: vi.fn() } as unknown as FlashcardAnswerGrader;
    repository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as NodeRepository;
    useCase = new ReviewFlashcardAnswerUseCase(repository, grader);

    card = FlashcardNode.create({
      isPublic: false,
      data: { front: 'front', back: 'back' },
    });
    vi.mocked(repository.findById).mockResolvedValue(card);
  });

  test.each([
    { score: 1 as const, quality: 5 },
    { score: 0.5 as const, quality: 3 },
    { score: 0 as const, quality: 0 },
  ])('maps score $score to quality $quality', async ({ score, quality }) => {
    vi.mocked(grader.evaluate).mockResolvedValue({ score, comment: 'ok' });
    const reviewSpy = vi.spyOn(FlashcardNode.prototype, 'review');

    const result = await useCase.execute({ id: card.id, answer: 'ans' });

    assertOk(result);
    expect(repository.findById).toHaveBeenCalledWith(card.id);
    expect(grader.evaluate).toHaveBeenCalledWith({
      front: card.data.front,
      back: card.data.back,
      answer: 'ans',
    });
    expect(reviewSpy).toHaveBeenCalledWith(quality);
    const updated = reviewSpy.mock.results[0].value as FlashcardNode;
    expect(repository.update).toHaveBeenCalledWith(updated);
    expect(result.value.evaluation.score).toBe(score);
    reviewSpy.mockRestore();
  });

  test('returns error when grader throws', async () => {
    vi.mocked(grader.evaluate).mockRejectedValue(new Error('fail'));
    const result = await useCase.execute({ id: card.id, answer: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });
});
