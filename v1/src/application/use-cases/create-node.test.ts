import { describe, test, expect } from 'vitest';
import { CreateNodeUseCase } from './create-node.js';
import { NodeFactory } from '../../domain/node-factory.js';
import { AjvValidator } from '../../external/validation/ajv-validator.js';
import type { JSONSchema } from '../../domain/ports/validator.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { Node } from '../../domain/node.js';

const mockRepository: NodeRepository = {
  save: async (node: Node) => Promise.resolve(),
  findById: async (id: string) => Promise.resolve(null),
  findAll: async () => Promise.resolve([]),
  searchNodes: async (query: string) => Promise.resolve([]),
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

    const useCase = new CreateNodeUseCase(factory, mockRepository);

    const result = await useCase.execute({
      type: 'note',
      title: 'My Note',
      data: { content: 'hello world' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.node.type).toBe('note');
      expect(result.node.title).toBe('My Note');
      expect(result.node.data.content).toBe('hello world');
      expect(result.node.isPublic).toBe(false);
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

    const useCase = new CreateNodeUseCase(factory, mockRepository);

    const result = await useCase.execute({
      type: 'note',
      data: { content: 'hyee' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.node.type).toBe('note');
      expect(result.node.title).toBe('Untitled Note');
      expect(result.node.data.content).toBe('hyee');
    }
  });

  test('creates a link node with URL as fallback title', async () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('link', linkSchema);

    const useCase = new CreateNodeUseCase(factory, mockRepository);

    const result = await useCase.execute({
      type: 'link',
      data: { url: 'https://example.com' },
      isPublic: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.node.type).toBe('link');
      expect(result.node.title).toBe('https://example.com');
      expect(result.node.data.url).toBe('https://example.com');
    }
  });
});
