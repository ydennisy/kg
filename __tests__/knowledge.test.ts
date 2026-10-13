import { describe, expect, test } from 'vitest';

import {
  draftFrom,
  draftProblem,
  guessType,
  normalizeTag,
  normalizeUrl,
} from '@/lib/knowledge/draft';
import {
  answer,
  currentKey,
  isFinished,
  progress,
  restart,
  startDrill,
} from '@/lib/knowledge/drill';
import {
  countByType,
  highlight,
  related,
  search,
  tagCounts,
} from '@/lib/knowledge/search';
import { tagColor } from '@/lib/knowledge/tag-color';
import type { Item, ItemType } from '@/lib/knowledge/types';

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

  test('tag colours are stable', () => {
    expect(tagColor('math')).toBe(tagColor('math'));
  });
});

describe('drill', () => {
  test('again sends a card to the back; the session ends once all are got', () => {
    let drill = startDrill(['a', 'b'], 'Due');
    expect(answer(drill, 'easy')).toBe(drill); // not revealed yet
    drill = answer({ ...drill, shown: true }, 'again');
    expect(drill.queue).toEqual(['a', 'b', 'a']);
    expect(currentKey(drill)).toBe('b');
    drill = answer({ ...drill, shown: true }, 'good');
    expect(progress(drill).label).toBe('2 / 2');
    drill = answer({ ...drill, shown: true }, 'good');
    expect(isFinished(drill)).toBe(true);
    expect(drill).toMatchObject({ got: 2, again: 1 });
    expect(progress(drill).fraction).toBe(1);
    expect(restart(drill)).toEqual(startDrill(['a', 'b'], 'Due'));
  });
});
