import { describe, expect, test } from 'vitest';

import {
  draftFrom,
  draftProblem,
  guessType,
  normalizeTag,
  normalizeUrl,
} from './draft';

describe('drafts', () => {
  test('guesses links, cards and notes', () => {
    expect(guessType('https://example.com')).toBe('link');
    expect(guessType('www.example.com/x')).toBe('link');
    expect(guessType('what is a monad?')).toBe('card');
    expect(guessType('shopping list')).toBe('note');
  });

  test('splits "question? answer" into a card', () => {
    expect(draftFrom('card', 'What is 2+2? 4', ['math'])).toEqual({
      type: 'card',
      a: 'What is 2+2?',
      b: '4',
      c: '',
      tags: ['math'],
    });
  });

  test('says what is missing', () => {
    expect(draftProblem(draftFrom('card', 'Front only?'))).toMatch(/both/);
    expect(draftProblem(draftFrom('card', 'Q? A'))).toBeNull();
    expect(draftProblem(draftFrom('link', 'not a url'))).toMatch(/URL/);
  });

  test('only accepts web URLs', () => {
    expect(normalizeUrl('example.com/a')).toBe('https://example.com/a');
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('hello')).toBeNull();
  });

  test('normalizes tags', () => {
    expect(normalizeTag(' #Linear Algebra ')).toBe('linear-algebra');
  });
});
