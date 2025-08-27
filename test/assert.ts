import { expect } from 'vitest';
import { Result } from '../src/shared/result';

function assertOk<T>(
  result: Result<T, Error>
): asserts result is { ok: true; value: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
}

export { assertOk };
