import { describe, expect, it } from 'vitest';

import { formatRelative } from '@/lib/date';

const now = new Date('2026-08-29T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);
const ahead = (seconds: number) => new Date(now.getTime() + seconds * 1000);

describe('formatRelative', () => {
  it('collapses anything within 45s to "just now"', () => {
    expect(formatRelative(now, now)).toBe('just now');
    expect(formatRelative(ago(44), now)).toBe('just now');
    expect(formatRelative(ahead(44), now)).toBe('just now');
  });

  it('reads back in the past', () => {
    expect(formatRelative(ago(5 * 60), now)).toBe('5 minutes ago');
    expect(formatRelative(ago(3 * 60 * 60), now)).toBe('3 hours ago');
    expect(formatRelative(ago(24 * 60 * 60), now)).toBe('yesterday');
    expect(formatRelative(ago(3 * 24 * 60 * 60), now)).toBe('3 days ago');
    expect(formatRelative(ago(20 * 24 * 60 * 60), now)).toBe('3 weeks ago');
    expect(formatRelative(ago(400 * 24 * 60 * 60), now)).toBe('1 year ago');
  });

  it('reads forward in the future', () => {
    expect(formatRelative(ahead(90), now)).toBe('in 2 minutes');
    expect(formatRelative(ahead(24 * 60 * 60), now)).toBe('tomorrow');
    expect(formatRelative(ahead(10 * 24 * 60 * 60), now)).toBe('in 1 week');
  });

  it('never rounds down to a zero-valued unit', () => {
    for (let seconds = 45; seconds < 400 * 24 * 60 * 60; seconds *= 1.3) {
      expect(formatRelative(ahead(seconds), now)).not.toMatch(/\b0\b/);
      expect(formatRelative(ago(seconds), now)).not.toMatch(/\b0\b/);
    }
  });
});
