import { describe, expect, test, vi } from 'vitest';
import { LinkNodesUseCase } from './link-nodes.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { NoteNode } from '../../domain/note-node.js';
import { FlashcardNode } from '../../domain/flashcard-node.js';

describe('LinkNodesUseCase', () => {
  test('defaults to related_to bidirectional links', async () => {
    const source = NoteNode.create({
      title: 'A',
      isPublic: false,
      data: { content: 'a' },
    });
    const target = NoteNode.create({
      title: 'B',
      isPublic: false,
      data: { content: 'b' },
    });

    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async (id: string) => {
        if (id === source.id) return source;
        if (id === target.id) return target;
        return null;
      }),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
      findDueFlashcards: vi.fn(async () => []),
    };

    const useCase = new LinkNodesUseCase(repository);
    await useCase.execute({ fromId: source.id, toId: target.id });

    expect(repository.link).toHaveBeenCalledWith(
      source.id,
      target.id,
      'related_to',
      true
    );
  });

  test('flashcards link to sources with derived_from', async () => {
    const source = NoteNode.create({
      title: 'Source',
      isPublic: false,
      data: { content: 's' },
    });
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
      findById: vi.fn(async (id: string) => {
        if (id === source.id) return source;
        if (id === card.id) return card;
        return null;
      }),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      findDueFlashcards: vi.fn(async () => []),
    };

    const useCase = new LinkNodesUseCase(repository);
    await useCase.execute({ fromId: card.id, toId: source.id });

    expect(repository.link).toHaveBeenCalledWith(
      card.id,
      source.id,
      'derived_from',
      false
    );
  });

  test('forwards provided parameters', async () => {
    const source = NoteNode.create({
      title: 'S',
      isPublic: false,
      data: { content: 's' },
    });
    const target = NoteNode.create({
      title: 'T',
      isPublic: false,
      data: { content: 't' },
    });

    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async (id: string) => {
        if (id === source.id) return source;
        if (id === target.id) return target;
        return null;
      }),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
      findDueFlashcards: vi.fn(async () => []),
    };

    const useCase = new LinkNodesUseCase(repository);
    await useCase.execute({
      fromId: source.id,
      toId: target.id,
      type: 'references',
      isBidirectional: true,
    });

    expect(repository.link).toHaveBeenCalledWith(
      source.id,
      target.id,
      'references',
      true
    );
  });

  test('returns failure when repository.link throws', async () => {
    const source = NoteNode.create({
      title: 'A',
      isPublic: false,
      data: { content: 'a' },
    });
    const target = NoteNode.create({
      title: 'B',
      isPublic: false,
      data: { content: 'b' },
    });

    const repository: NodeRepository = {
      save: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      link: vi.fn(async () => {
        throw new Error('fail');
      }),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async (id: string) => {
        if (id === source.id) return source;
        if (id === target.id) return target;
        return null;
      }),
      findLinkNodeByUrl: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
      findDueFlashcards: vi.fn(async () => []),
    };

    const useCase = new LinkNodesUseCase(repository);
    const result = await useCase.execute({ fromId: source.id, toId: target.id });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });
});
