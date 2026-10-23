import { describe, expect, test } from 'vitest';

import {
  addTag,
  ancestors,
  childrenOf,
  normalizeTagPath,
  suggestTags,
  tagPaths,
  within,
  withoutImplied,
} from './tags';

describe('tag paths', () => {
  test('normalise each segment and drop empty ones', () => {
    expect(normalizeTagPath(' Programming / Data Bases/ ')).toBe(
      'programming/data-bases',
    );
    expect(normalizeTagPath('#rl//notation')).toBe('rl/notation');
    expect(normalizeTagPath('///')).toBe('');
  });

  test('a branch holds itself and what is under it, not its lookalikes', () => {
    expect(within('programming/databases', 'programming')).toBe(true);
    expect(within('programming', 'programming')).toBe(true);
    expect(within('programming-languages', 'programming')).toBe(false);
    expect(within('programming', 'programming/databases')).toBe(false);
  });

  test('ancestors and children come from the paths alone', () => {
    expect(ancestors('a/b/c')).toEqual(['a', 'a/b']);
    expect(childrenOf(['a/b/c', 'a/d', 'e'], null)).toEqual(['a', 'e']);
    expect(childrenOf(['a/b/c', 'a/d', 'e'], 'a')).toEqual(['a/b', 'a/d']);
  });

  test('an item never carries a tag its more specific tags imply', () => {
    expect(withoutImplied(['a', 'a/b', 'c', 'a/b'])).toEqual(['a/b', 'c']);
  });
});

describe('adding a tag', () => {
  test('replaces the ancestors it implies', () => {
    expect(addTag(['programming', 'rl'], 'programming/databases')).toEqual({
      tags: ['rl', 'programming/databases'],
      note: 'Replaced programming, which programming/databases implies.',
    });
  });

  test('ignores a parent that is already implied', () => {
    expect(addTag(['programming/databases'], 'programming')).toEqual({
      tags: ['programming/databases'],
      note: 'programming is already implied by programming/databases.',
    });
  });
});

describe('tagPaths', () => {
  test('builds paths from parent ids, skipping broken or looping chains', () => {
    const paths = tagPaths([
      { id: 1, parentId: null, name: 'programming' },
      { id: 2, parentId: 1, name: 'databases' },
      { id: 3, parentId: 2, name: 'sqlite' },
      { id: 4, parentId: 99, name: 'orphan' },
      { id: 5, parentId: 6, name: 'x' },
      { id: 6, parentId: 5, name: 'y' },
    ]);
    expect([...paths]).toEqual([
      [1, 'programming'],
      [2, 'programming/databases'],
      [3, 'programming/databases/sqlite'],
    ]);
  });
});

describe('suggestTags', () => {
  const known = [
    'programming',
    'programming/databases',
    'reinforcement-learning',
  ];

  test('with nothing typed, offers the known tags not already chosen', () => {
    expect(suggestTags(known, ['programming'], '').map((s) => s.path)).toEqual([
      'programming/databases',
      'reinforcement-learning',
    ]);
  });

  test('matches inside paths, prefixes and leaf names first', () => {
    expect(suggestTags(known, [], 'data')).toEqual([
      { path: 'programming/databases', create: false, children: 0 },
      { path: 'data', create: true, children: 0 },
    ]);
    expect(suggestTags(known, [], 'prog')[0]).toEqual({
      path: 'programming',
      create: false,
      children: 1,
    });
  });

  test('offers to create a new nested path', () => {
    expect(suggestTags(known, [], 'programming/Closures').at(-1)).toEqual({
      path: 'programming/closures',
      create: true,
      children: 0,
    });
  });
});
