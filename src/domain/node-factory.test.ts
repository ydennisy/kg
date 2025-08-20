import { describe, test, expect, expectTypeOf } from 'vitest';
import { NodeFactory } from './node-factory.js';
import { AjvValidator } from '../external/validation/ajv-validator.js';
import type { JSONSchema } from './ports/validator.js';

describe('NodeFactory', () => {
  test('creates a valid `link` type node', () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('link', linkSchema);

    const URL = 'https://example.com';
    const linkNode = factory.createNode(
      'link',
      'Example Website Title',
      false,
      {
        url: URL,
      }
    );

    expect(linkNode.id).toBeDefined();
    expect(linkNode.id.length).toBeGreaterThan(0);
    expectTypeOf(linkNode.id).toBeString();
    expect(linkNode.data.url).toBe(URL);
    expect(linkNode.isPublic).toBe(false); // Default value
  });

  test('creates a public node when isPublic is true', () => {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);

    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('link', linkSchema);

    const URL = 'https://example.com';
    const linkNode = factory.createNode('link', 'Example Website Title', true, {
      url: URL,
    });

    expect(linkNode.id).toBeDefined();
    expect(linkNode.data.url).toBe(URL);
    expect(linkNode.isPublic).toBe(true);
  });
});
