import { describe, expect, test } from 'vitest';

import {
  branchCounts,
  countByType,
  highlight,
  knownTags,
  related,
  search,
  tagCounts,
} from './search';
import type { Item, ItemType } from './types';

let next = 0;
function item(
  type: ItemType,
  title: string,
  body: string,
  tags: string[],
  extra: Partial<Item> = {},
): Item {
  next += 1;
  return {
    key: `${type}:${next}`,
    id: next,
    type,
    title,
    body,
    summary: '',
    keywords: '',
    titleMarkdown: title,
    bodyMarkdown: body,
    titleHtml: '',
    bodyHtml: '',
    url: null,
    tags,
    touchedAt: next,
    date: '',
    due: false,
    ...extra,
  };
}

const det = item('card', 'What does a determinant measure?', 'Area scaling', [
  'linear-algebra',
  'math',
]);
const bayes = item('card', "State Bayes' theorem", 'posterior ∝ prior', [
  'probability',
]);
const chapter = item('note', 'Chapter map', 'Determinants, then eigen', [
  'linear-algebra',
]);
const video = item(
  'link',
  'Essence of linear algebra',
  '',
  ['linear-algebra'],
  {
    url: 'https://www.3blue1brown.com/topics/linear-algebra',
  },
);
const items = [det, bayes, chapter, video];

describe('search', () => {
  test('matches titles, note bodies, urls and tags, newest first', () => {
    expect(search(items, { query: 'determinant', tag: null })).toEqual([
      chapter,
      det,
    ]);
    expect(search(items, { query: '3blue1brown', tag: null })).toEqual([video]);
    expect(search(items, { query: 'PROBABILITY', tag: null })).toEqual([bayes]);
  });

  test('never searches the back of a card', () => {
    expect(search(items, { query: 'area scaling', tag: null })).toEqual([]);
  });

  test('a tag narrows, and combines with the query', () => {
    expect(search(items, { query: '', tag: 'linear-algebra' })).toHaveLength(3);
    expect(search(items, { query: 'map', tag: 'linear-algebra' })).toEqual([
      chapter,
    ]);
  });

  test('counts types and tags', () => {
    expect(countByType(items)).toEqual({ card: 2, note: 1, link: 1 });
    expect(tagCounts(items)[0]).toEqual({ name: 'linear-algebra', count: 3 });
    expect(tagCounts(items, 'linear-algebra').map((t) => t.name)).toEqual([
      'math',
      'probability',
    ]);
  });

  test('related items share a tag, and mid-drill leave other cards out', () => {
    expect(related(det, items, { limit: 5 })).toEqual([video, chapter]);
    expect(related(chapter, items, { limit: 5, cards: false })).toEqual([
      video,
    ]);
  });
});

describe('nested tags', () => {
  const fk = item('card', 'What is a foreign key?', '', [
    'programming/databases',
  ]);
  const pushdown = item('card', 'What is predicate pushdown?', '', [
    'programming/databases/datafusion',
  ]);
  const closure = item('card', 'What is a closure?', '', [
    'programming/closures',
  ]);
  const ddd = item('card', 'What is a bounded context?', '', ['programming']);
  const rl = item('card', 'What does S_t mean?', '', [
    'reinforcement-learning',
  ]);
  const nested = [fk, pushdown, closure, ddd, rl];

  test('a parent tag finds everything in its branch', () => {
    expect(search(nested, { query: '', tag: 'programming' })).toEqual([
      ddd,
      closure,
      pushdown,
      fk,
    ]);
    expect(search(nested, { query: '', tag: 'programming/databases' })).toEqual(
      [pushdown, fk],
    );
  });

  test('branch counts roll up, one per item, and say what nests', () => {
    expect(branchCounts(nested, null)).toEqual([
      { name: 'programming', count: 4, nested: true },
      { name: 'reinforcement-learning', count: 1, nested: false },
    ]);
    expect(branchCounts(nested, 'programming')).toEqual([
      { name: 'programming/databases', count: 2, nested: true },
      { name: 'programming/closures', count: 1, nested: false },
    ]);
  });

  test('filtering a branch leaves the whole branch out of the other tags', () => {
    expect(tagCounts(nested, 'programming')).toEqual([
      { name: 'reinforcement-learning', count: 1 },
    ]);
  });

  test('known tags include implied parents, busiest branches first', () => {
    expect(knownTags(nested)).toEqual([
      'programming',
      'programming/databases',
      'programming/closures',
      'programming/databases/datafusion',
      'reinforcement-learning',
    ]);
  });

  test('items are related through a parent or a child tag', () => {
    expect(related(ddd, nested, { limit: 5 })).toEqual([closure, pushdown, fk]);
    expect(related(fk, nested, { limit: 5 })).toEqual([ddd, pushdown]);
  });
});

describe('highlight', () => {
  test('splits around case-insensitive hits', () => {
    expect(highlight('Map the map', 'MAP')).toEqual([
      { text: 'Map', hit: true },
      { text: ' the ', hit: false },
      { text: 'map', hit: true },
    ]);
  });

  test('treats the query literally', () => {
    expect(highlight('O(log n)', '(log')).toEqual([
      { text: 'O', hit: false },
      { text: '(log', hit: true },
      { text: ' n)', hit: false },
    ]);
  });
});
