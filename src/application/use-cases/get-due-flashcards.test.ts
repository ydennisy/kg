import { describe, expect, test, vi } from 'vitest';
import { GetDueFlashcardsUseCase } from './get-due-flashcards.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { FlashcardNode } from '../../domain/flashcard-node.js';
import { assertOk } from '../../../test/assert.js';


describe('GetDueFlashcardsUseCase', () => {
  test('returns flashcards from repository', async () => {
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
      findDueFlashcards: vi.fn(async () => [card]),
    };

    const useCase = new GetDueFlashcardsUseCase(repository);
    const date = new Date('2024-01-01T00:00:00Z');
    const result = await useCase.execute({ limit: 10, date });

    assertOk(result);
    expect(repository.findDueFlashcards).toHaveBeenCalledWith(date, 10);
    expect(result.value).toEqual([card]);
  });

  test('passes current date when none provided', async () => {
    vi.useFakeTimers();
    const now = new Date('2024-02-01T00:00:00Z');
    vi.setSystemTime(now);

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

    const useCase = new GetDueFlashcardsUseCase(repository);
    await useCase.execute({ limit: 5 });

    expect(repository.findDueFlashcards).toHaveBeenCalledWith(
      expect.any(Date),
      5
    );
    const passedDate = vi.mocked(repository.findDueFlashcards).mock.calls[0][0];
    expect(passedDate.getTime()).toBe(now.getTime());
    vi.useRealTimers();
  });

  test('returns failure when repository throws', async () => {
    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {}),
      search: vi.fn(async () => []),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      findDueFlashcards: vi.fn(async () => {
        throw new Error('fail');
      }),
    };

    const useCase = new GetDueFlashcardsUseCase(repository);
    const result = await useCase.execute({ limit: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });
});

