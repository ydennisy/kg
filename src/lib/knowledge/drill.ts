import type { Grade } from '@/lib/srs';

/**
 * A drill session: the cards to get through, in order. A card answered
 * "again" goes to the back of the queue, so the session only ends once every
 * card has been recalled once. The scheduler hears about every answer
 * separately; this is only the session's own bookkeeping.
 */
export type Drill = {
  label: string;
  /** Card keys, with "again" answers appended as they happen. */
  queue: string[];
  original: string[];
  position: number;
  shown: boolean;
  got: number;
  again: number;
};

export function startDrill(keys: string[], label: string): Drill {
  return {
    label,
    queue: keys,
    original: keys,
    position: 0,
    shown: false,
    got: 0,
    again: 0,
  };
}

export const currentKey = (drill: Drill): string | null =>
  drill.queue[drill.position] ?? null;

export const isFinished = (drill: Drill) =>
  drill.position >= drill.queue.length;

export function answer(drill: Drill, grade: Grade): Drill {
  const gotIt = grade !== 'again';
  const key = currentKey(drill);
  if (key === null || !drill.shown) {
    return drill;
  }
  return {
    ...drill,
    queue: gotIt ? drill.queue : [...drill.queue, key],
    position: drill.position + 1,
    shown: false,
    got: drill.got + (gotIt ? 1 : 0),
    again: drill.again + (gotIt ? 0 : 1),
  };
}

export const restart = (drill: Drill): Drill =>
  startDrill(drill.original, drill.label);

/** Progress counts cards got, not answers given, so "again" never moves it. */
export function progress(drill: Drill) {
  const total = drill.original.length;
  return {
    total,
    fraction: total ? drill.got / total : 1,
    label: `${Math.min(drill.got + 1, total)} / ${total}`,
  };
}
