import { describe, test, expect } from 'vitest';
import { AjvValidator } from './ajv-validator.js';
import type { JSONSchema } from '../../domain/ports/validator.js';

describe('AjvValidator', () => {
  test('should return false for invalid data', () => {
    const validator = new AjvValidator();

    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'integer' },
        bar: { type: 'string' },
      },
      required: ['foo', 'bar'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const { isValid, errors } = validator.validate(schema, {});
    expect(isValid).toBe(false);
    expect(errors.length).toBe(2);
  });

  test('should return true for valid data', () => {
    const validator = new AjvValidator();

    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'integer' },
        bar: { type: 'string' },
      },
      required: ['foo', 'bar'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const data = { foo: 1, bar: 'baz' };
    const { isValid, errors } = validator.validate(schema, data);

    expect(isValid).toBe(true);
    expect(errors.length).toBe(0);
  });
});
