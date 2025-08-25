import { expect } from 'vitest';

function assertOk<T>(
  result: { ok: true; result: T } | { ok: false; error: string }
): asserts result is { ok: true; result: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

export { assertOk };
