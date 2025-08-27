import { describe, test, beforeEach, expect, vi } from 'vitest';
import { CreateNodeUseCase } from './create-node.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { Crawler } from '../ports/crawler.js';
import { assertOk } from '../../../test/assert.js';

describe('CreateNodeUseCase', () => {
  let repository: NodeRepository;
  let crawler: Crawler;
  let useCase: CreateNodeUseCase;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findLinkNodeByUrl: vi.fn(),
    } as unknown as NodeRepository;
    crawler = { fetch: vi.fn() } as unknown as Crawler;
    useCase = new CreateNodeUseCase(repository, crawler);
  });

  test('creates a note node', async () => {
    const result = await useCase.execute({
      type: 'note',
      title: 'My Note',
      data: { content: 'hello world' },
      isPublic: false,
    });
    assertOk(result);
    expect(result.value.node.type).toBe('note');
    expect(repository.save).toHaveBeenCalledWith(result.value.node);
    expect(crawler.fetch).not.toHaveBeenCalled();
  });

  test('creates a link node using crawler data', async () => {
    vi.mocked(crawler.fetch).mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
      text: 'Example',
      markdown: 'Example',
      html: '<p>Example</p>',
    });

    const result = await useCase.execute({
      type: 'link',
      data: { url: 'https://example.com' },
      isPublic: true,
    });

    assertOk(result);
    expect(crawler.fetch).toHaveBeenCalledWith('https://example.com');
    expect(result.value.node.type).toBe('link');
    expect(repository.save).toHaveBeenCalledWith(result.value.node);
  });

  test('creates a tag node', async () => {
    const result = await useCase.execute({
      type: 'tag',
      isPublic: false,
      data: { name: 'math', description: 'numbers' },
    });
    assertOk(result);
    expect(result.value.node.type).toBe('tag');
    expect(repository.save).toHaveBeenCalledWith(result.value.node);
    expect(crawler.fetch).not.toHaveBeenCalled();
  });

  test('creates a flashcard node', async () => {
    const result = await useCase.execute({
      type: 'flashcard',
      isPublic: true,
      data: { front: '2+2', back: '4' },
    });
    assertOk(result);
    expect(result.value.node.type).toBe('flashcard');
    expect(repository.save).toHaveBeenCalledWith(result.value.node);
    expect(crawler.fetch).not.toHaveBeenCalled();
  });

  test('returns error when repository throws', async () => {
    vi.mocked(repository.save).mockRejectedValue(new Error('db error'));
    const result = await useCase.execute({
      type: 'note',
      title: 'Err',
      isPublic: false,
      data: { content: 'x' },
    });

    // TODO: create a helper for assertNotOk :)
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});
