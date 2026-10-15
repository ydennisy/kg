import { describe, expect, test } from 'vitest';

import {
  answer,
  currentKey,
  isFinished,
  progress,
  restart,
  startDrill,
} from './drill';

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
