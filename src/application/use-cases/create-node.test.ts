import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CreateNodeUseCase } from './create-node.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { Crawler } from '../ports/crawler.js';
import type { AnyNode } from '../../domain/types.js';
import type { SearchIndex } from '../ports/search-index.js';

const mockRepository: NodeRepository = {
  save: async (node: AnyNode) => Promise.resolve(),
  findById: async (id: string) => Promise.resolve(null),
  findAll: async () => Promise.resolve([]),
  search: async (query: string, withRelations?: boolean) =>
    Promise.resolve([]),
  link: async (sourceId: string, targetId: string, type?) => Promise.resolve(),
};

const mockCrawler: Crawler = {
  fetch: async (url: string) => ({
    url,
    title: undefined,
    text: 'Example Website Title',
    markdown: 'Example Website Title',
    html: '<p>Example Website Title</p>',
  }),
};

const mockSearchIndex: SearchIndex = {
  indexNode: vi.fn(async (node: AnyNode) => Promise.resolve()),
  removeNode: vi.fn(async (id: string) => Promise.resolve()),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateNodeUseCase', () => {
  test('creates a `note` node successfully', async () => {
    const useCase = new CreateNodeUseCase(
      mockRepository,
      mockCrawler,
      mockSearchIndex
    );
    const result = await useCase.execute({
      type: 'note',
      title: 'My Note',
      data: { content: 'hello world' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.result.type === 'note') {
      expect(result.result.type).toBe('note');
      expect(result.result.title).toBe('My Note');
      expect(result.result.content).toBe('hello world');
      expect(result.result.isPublic).toBe(false);
    }
    expect(mockSearchIndex.indexNode).toHaveBeenCalled();
  });

  test('creates a `link` node successfully', async () => {
    const useCase = new CreateNodeUseCase(
      mockRepository,
      mockCrawler,
      mockSearchIndex
    );
    const result = await useCase.execute({
      type: 'link',
      data: { url: 'https://example.com' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.result.type === 'link') {
      expect(result.result.type).toBe('link');
      expect(result.result.data.url).toBe('https://example.com');
    }
    expect(mockSearchIndex.indexNode).toHaveBeenCalled();
  });
});
