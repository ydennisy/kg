import { describe, expect, test, vi } from 'vitest';
import { ReviewFlashcardUseCase } from './review-flashcard.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { FlashcardNode } from '../../domain/flashcard-node.js';
import { assertOk } from '../../../test/assert.js';

describe('ReviewFlashcardUseCase', () => {
  test('reviews flashcard and updates repository', async () => {
    const card = FlashcardNode.create({
      isPublic: false,
      data: { front: 'f', back: 'b' },
    });

    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {}),
      search: vi.fn(async () => []),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      findDueFlashcards: vi.fn(async () => []),
    };

    const reviewSpy = vi.spyOn(card, 'review');
    const useCase = new ReviewFlashcardUseCase(repository);

    const result = await useCase.execute({ flashcard: card, quality: 4 });

    assertOk(result);
    expect(reviewSpy).toHaveBeenCalledWith(4);
    const updated = reviewSpy.mock.results[0].value as FlashcardNode;
    expect(repository.update).toHaveBeenCalledWith(updated);
    expect(result.value).toBe(updated);
    reviewSpy.mockRestore();
  });

  test('returns failure when repository.update throws', async () => {
    const card = FlashcardNode.create({
      isPublic: false,
      data: { front: 'f', back: 'b' },
    });

    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {
        throw new Error('fail');
      }),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {}),
      search: vi.fn(async () => []),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      findDueFlashcards: vi.fn(async () => []),
    };

    const useCase = new ReviewFlashcardUseCase(repository);
    const result = await useCase.execute({ flashcard: card, quality: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });
});

