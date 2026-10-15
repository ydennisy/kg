import { expect, test } from 'vitest';
import { tagColor } from './tag-color';

test('tag colours are stable', () => {
  expect(tagColor('math')).toBe(tagColor('math'));
});
