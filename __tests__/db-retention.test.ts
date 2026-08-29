import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseSnapshotName, prune, snapshotName } from '../scripts/db.mjs';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A fixed "now" so the tiers land in the same place on every run. */
const NOW = new Date('2026-08-29T12:00:00.000Z').getTime();

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcards-backups-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Lay down empty files standing in for snapshots at the given ages. */
function given(ages: number[], label?: string): string[] {
  return ages.map((age) => {
    const name = snapshotName(new Date(NOW - age), label);
    fs.writeFileSync(path.join(dir, name), '');
    return name;
  });
}

function survivors(): string[] {
  prune(dir, NOW);
  return fs.readdirSync(dir).sort();
}

describe('snapshot names', () => {
  it('round-trips a timestamp', () => {
    const at = new Date('2026-08-29T16:31:03.085Z');
    expect(parseSnapshotName(snapshotName(at))).toEqual({
      at,
      label: undefined,
    });
  });

  it('round-trips a label', () => {
    const at = new Date('2026-08-29T16:31:03.085Z');
    expect(snapshotName(at, 'before-migrate')).toBe(
      'prod-2026-08-29T16-31-03-085Z-before-migrate.db',
    );
    expect(parseSnapshotName(snapshotName(at, 'before-migrate'))).toEqual({
      at,
      label: 'before-migrate',
    });
  });

  it('sorts lexicographically by time', () => {
    const names = [0, DAY, 2 * DAY].map((age) =>
      snapshotName(new Date(NOW - age)),
    );
    expect([...names].sort()).toEqual([...names].reverse());
  });

  it.each([
    'prod.db',
    'prod-.db',
    'notes.txt',
    'prod-2026-08-29.db',
    'dev-2026-08-29T16-31-03-085Z.db',
  ])('ignores %s', (name) => {
    expect(parseSnapshotName(name)).toBeNull();
  });
});

describe('retention', () => {
  it('leaves an empty directory alone', () => {
    expect(survivors()).toEqual([]);
  });

  it('never deletes the newest snapshot', () => {
    const [newest] = given([0, HOUR, DAY, 40 * DAY, 400 * DAY]);
    expect(survivors()).toContain(newest);
  });

  it('keeps every snapshot from the last two days', () => {
    const hourly = given(
      Array.from({ length: 48 }, (_, index) => index * HOUR),
    );
    expect(survivors()).toEqual([...hourly].sort());
  });

  it('collapses snapshots from the same hour to the newest', () => {
    // 11:55, 11:40 and 11:15 against a noon "now" — one hour bucket.
    const [newest] = given([5 * 60 * 1000, 20 * 60 * 1000, 45 * 60 * 1000]);
    expect(survivors()).toEqual([newest]);
  });

  it('thins to one a day between two and thirty days', () => {
    // Four a day for a fortnight, all of it older than the hourly tier.
    const ages = [];
    for (let day = 3; day <= 16; day += 1) {
      for (const hour of [0, 6, 12, 18]) ages.push(day * DAY + hour * HOUR);
    }
    given(ages);

    const kept = survivors().map((name) => parseSnapshotName(name)!.at);
    const days = new Set(kept.map((at) => at.toISOString().slice(0, 10)));

    expect(kept).toHaveLength(days.size); // never two from the same day
    expect(kept.length).toBeGreaterThanOrEqual(14); // nor a day with none
    expect(kept.length).toBeLessThan(ages.length / 3); // and it did thin
  });

  it('thins to one a week beyond thirty days', () => {
    // Daily for a year, all of it past the daily tier.
    const ages = Array.from({ length: 365 }, (_, index) => (index + 31) * DAY);
    given(ages);

    const kept = survivors();
    expect(kept.length).toBeGreaterThanOrEqual(52);
    expect(kept.length).toBeLessThanOrEqual(54);
  });

  it('still has something from a year ago after a year of hourly backups', () => {
    const ages: number[] = [];
    for (let hour = 0; hour < 365 * 24; hour += 1) ages.push(hour * HOUR);
    given(ages);

    const kept = survivors().map(
      (name) => NOW - parseSnapshotName(name)!.at.getTime(),
    );

    // The point of the tiers: a year of hourly backups still leaves a copy
    // from before last week, which a flat "keep the newest N" would not.
    expect(Math.max(...kept)).toBeGreaterThan(300 * DAY);
    expect(kept.length).toBeLessThan(150);
  });

  it('never prunes a labelled snapshot, however old or crowded', () => {
    const labelled = given(
      [200 * DAY, 200 * DAY + 60 * 1000],
      'before-migrate',
    );
    given(Array.from({ length: 48 }, (_, index) => index * HOUR));

    expect(survivors()).toEqual(expect.arrayContaining(labelled));
  });

  it('keeps a pre-migration copy that an hourly backup would have evicted', () => {
    // The failure this exists to prevent: back up, migrate badly, and have a
    // later backup land in the same hour bucket and win it. 11:30 labelled,
    // 11:50 not — without the label rule, 11:50 would evict it.
    const [safety] = given([30 * 60 * 1000], 'before-migrate');
    given([10 * 60 * 1000]);

    expect(survivors()).toContain(safety);
  });

  it('leaves files it does not recognise untouched', () => {
    fs.writeFileSync(path.join(dir, 'README.txt'), 'not a snapshot');
    given([0]);

    expect(survivors()).toContain('README.txt');
  });
});
