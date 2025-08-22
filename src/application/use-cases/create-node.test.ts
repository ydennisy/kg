import { describe, test, expect } from 'vitest';
import { CreateNodeUseCase } from './create-node.js';
import { NodeFactory } from '../../domain/node-factory.js';
import { AjvValidator } from '../../external/validation/ajv-validator.js';
import type { JSONSchema } from '../../domain/ports/validator.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { Node } from '../../domain/node.js';
import type { Crawler } from '../ports/crawler.js';

const mockRepository: NodeRepository = {
  save: async (node: Node) => Promise.resolve(),
  findById: async (id: string) => Promise.resolve(null),
  findAll: async () => Promise.resolve([]),
  search: async (query: string) => Promise.resolve([]),
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

describe('CreateNodeUseCase', () => {
  test('creates a note node successfully with title', async () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const noteSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('note', noteSchema);

    const useCase = new CreateNodeUseCase(
      factory,
      mockRepository,
      mockCrawler
    );

    const result = await useCase.execute({
      type: 'note',
      title: 'My Note',
      data: { content: 'hello world' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.type).toBe('note');
      expect(result.result.title).toBe('My Note');
      expect(result.result.data.content).toBe('hello world');
      expect(result.result.isPublic).toBe(false);
    }
  });

  test('creates a note node with fallback title when no title provided', async () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const noteSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('note', noteSchema);

    const useCase = new CreateNodeUseCase(
      factory,
      mockRepository,
      mockCrawler
    );

    const result = await useCase.execute({
      type: 'note',
      data: { content: 'hyee' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.type).toBe('note');
      expect(result.result.title).toBe('Untitled Note');
      expect(result.result.data.content).toBe('hyee');
    }
  });

  test('creates a link node with URL as fallback title', async () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const linkSchema = {
      type: 'object',
      properties: {
        url: { type: 'string' },
        text: { type: 'string' },
        html: { type: 'string' },
      },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('link', linkSchema);

    const useCase = new CreateNodeUseCase(
      factory,
      mockRepository,
      mockCrawler
    );

    const result = await useCase.execute({
      type: 'link',
      data: { url: 'https://example.com' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.type).toBe('link');
      expect(result.result.title).toBe('https://example.com');
      expect(result.result.data.url).toBe('https://example.com');
    }
  });
});
