import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GenerateFlashcardsUseCase } from './generate-flashcards.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { TagNode } from '../../domain/tag-node.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { FlashcardGenerator, Flashcard } from '../ports/flashcard-generator.js';
import { assertOk } from '../../../test/assert.js';

// Unit tests for GenerateFlashcardsUseCase

describe('GenerateFlashcardsUseCase', () => {
  let repository: NodeRepository;
  let generator: FlashcardGenerator;
  let useCase: GenerateFlashcardsUseCase;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as NodeRepository;
    generator = {
      generate: vi.fn(),
    } as FlashcardGenerator;
    useCase = new GenerateFlashcardsUseCase(repository, generator);
  });

  test('returns error when node not found', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 'missing' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Node not found');
    }
  });

  test('generates flashcards for note node', async () => {
    const note = NoteNode.create({
      title: 'Test Note',
      isPublic: false,
      data: { content: 'Content' },
    });
    const flashcards: Array<Flashcard> = [
      { front: 'Q', back: 'A' },
    ];
    vi.mocked(repository.findById).mockResolvedValue(note);
    vi.mocked(generator.generate).mockResolvedValue(flashcards);

    const result = await useCase.execute({ id: note.id });
    assertOk(result);
    expect(result.value).toEqual(flashcards);
    expect(generator.generate).toHaveBeenCalledWith('Test Note | Content');
  });

  test('generates flashcards for link node', async () => {
    const link = LinkNode.create({
      title: 'Example',
      isPublic: false,
      data: {
        url: 'https://example.com',
        crawled: { title: 'Example', text: 'Example text', html: '<p></p>' },
      },
    });
    const flashcards: Array<Flashcard> = [
      { front: 'LQ', back: 'LA' },
    ];
    vi.mocked(repository.findById).mockResolvedValue(link);
    vi.mocked(generator.generate).mockResolvedValue(flashcards);

    const result = await useCase.execute({ id: link.id });
    assertOk(result);
    expect(result.value).toEqual(flashcards);
    expect(generator.generate).toHaveBeenCalledWith('Example | Example text');
  });

  test('returns error for unsupported node types', async () => {
    const tag = TagNode.create({
      isPublic: false,
      data: { name: 'topic' },
    });
    vi.mocked(repository.findById).mockResolvedValue(tag);

    const result = await useCase.execute({ id: tag.id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Flashcards can be generated only from `note` or `link` node types'
      );
    }
  });

  test('returns error when repository throws', async () => {
    vi.mocked(repository.findById).mockRejectedValue(new Error('db error'));

    const result = await useCase.execute({ id: 'id' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('db error');
    }
  });
});
