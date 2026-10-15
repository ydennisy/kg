// @vitest-environment node
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const identity = vi.hoisted(() => ({
  id: 'alice',
  signedIn: true,
  directory: '',
}));
vi.mock('@/lib/auth', () => ({
  requireUser: async () => {
    if (!identity.signedIn) throw new Error('Sign in required');
    return { id: identity.id };
  },
}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { createClient } = await import('@libsql/client');
  const { drizzle } = await import('drizzle-orm/libsql');
  const schema = await import('@/lib/db/schema');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  identity.directory = mkdtempSync(join(tmpdir(), 'fcards-ownership-'));
  return {
    ...schema,
    db: drizzle(createClient({ url: `file:${identity.directory}/target.db` }), {
      schema,
    }),
  };
});

import { db } from '@/lib/db';
import { saveItem, deleteItem, gradeCard } from '@/app/actions';
import { loadItems } from '@/lib/knowledge/load';
import { assignOwner, importLegacy } from '../scripts/lib/ownership.mjs';
import type { ItemDraft } from '@/lib/knowledge/types';

const client = db.$client;
const baseline = readFileSync('drizzle/0000_initial_schema.sql', 'utf8');
const draft = (
  type: ItemDraft['type'] = 'card',
  tags = ['shared'],
): ItemDraft => ({
  type,
  a: type === 'link' ? 'https://example.com' : 'Private title',
  b: 'Private body',
  c: '',
  tags,
});

beforeEach(async () => {
  identity.id = 'alice';
  identity.signedIn = true;
  await client.execute('PRAGMA foreign_keys = OFF');
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const row of tables.rows)
    await client.execute(`DROP TABLE "${row.name}"`);
  await client.executeMultiple(baseline);
  await client.execute('PRAGMA foreign_keys = ON');
  for (const id of ['alice', 'bob']) {
    await client.execute({
      sql: 'INSERT INTO user (id, name, email) VALUES (?, ?, ?)',
      args: [id, id, `${id}@example.com`],
    });
    await client.execute({
      sql: "INSERT INTO account (id, account_id, provider_id, user_id, updated_at) VALUES (?, ?, 'github', ?, 0)",
      args: [id, id, id],
    });
  }
});
afterAll(() => {
  client.close();
  rmSync(identity.directory, { recursive: true, force: true });
});

async function snapshot() {
  const result = [];
  for (const table of [
    'cards',
    'notes',
    'tags',
    'card_tags',
    'note_tags',
    'reviews',
  ]) {
    result.push(
      (await client.execute(`SELECT * FROM ${table} ORDER BY rowid`)).rows,
    );
  }
  return result;
}

describe('private collections through real SQL and server actions', () => {
  it.each(['card', 'note', 'link'] as const)(
    'isolates %s reads, updates, tags and deletes',
    async (type) => {
      expect((await saveItem(draft(type))).ok).toBe(true);
      const [aliceItem] = await loadItems('alice');
      identity.id = 'bob';
      expect(await loadItems('bob')).toEqual([]);
      const before = await snapshot();
      expect(
        await saveItem(draft(type, ['attack']), { type, id: aliceItem.id }),
      ).toEqual({ ok: false, error: 'Item not found' });
      await deleteItem(type, aliceItem.id);
      await gradeCard(aliceItem.id, 'easy');
      expect(await snapshot()).toEqual(before);
      await saveItem(draft(type));
      expect(await loadItems('bob')).toHaveLength(1);
      const tags = await client.execute(
        "SELECT user_id FROM tags WHERE name = 'shared' ORDER BY user_id",
      );
      expect(tags.rows.map((row) => row.user_id)).toEqual(['alice', 'bob']);
      identity.id = 'alice';
      expect(
        (
          await saveItem(
            { ...draft(type), b: 'Edited' },
            { type, id: aliceItem.id },
          )
        ).ok,
      ).toBe(true);
      await deleteItem(type, aliceItem.id);
      expect(await loadItems('alice')).toEqual([]);
      expect(await loadItems('bob')).toHaveLength(1);
    },
  );

  it('keeps scheduling and review history private and deletes only owned history', async () => {
    await saveItem(draft());
    const [item] = await loadItems('alice');
    await gradeCard(item.id, 'good');
    const before = await snapshot();
    identity.id = 'bob';
    await gradeCard(item.id, 'again');
    await deleteItem('card', item.id);
    expect(await snapshot()).toEqual(before);
    expect((await client.execute('SELECT * FROM reviews')).rows).toHaveLength(
      1,
    );
    identity.id = 'alice';
    await deleteItem('card', item.id);
    expect((await client.execute('SELECT * FROM reviews')).rows).toHaveLength(
      0,
    );
  });

  it('requires authentication for every mutation', async () => {
    identity.signedIn = false;
    await expect(saveItem(draft())).rejects.toThrow('Sign in required');
    await expect(deleteItem('card', 1)).rejects.toThrow('Sign in required');
    await expect(gradeCard(1, 'good')).rejects.toThrow('Sign in required');
    expect((await client.execute('SELECT * FROM cards')).rows).toHaveLength(0);
  });
});

describe('fresh baseline and legacy import', () => {
  it('applies the single baseline through the migrator and can rerun it', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'fcards-baseline-'));
    const fresh = createClient({ url: `file:${directory}/fresh.db` });
    try {
      const { drizzle } = await import('drizzle-orm/libsql');
      const { migrate } = await import('drizzle-orm/libsql/migrator');
      const database = drizzle(fresh);
      await migrate(database, { migrationsFolder: 'drizzle' });
      await migrate(database, { migrationsFolder: 'drizzle' });
      expect(
        (await fresh.execute('SELECT * FROM __drizzle_migrations')).rows,
      ).toHaveLength(1);
      expect(
        (await fresh.execute('PRAGMA table_info(cards)')).rows.map(
          (row) => row.name,
        ),
      ).toContain('user_id');
    } finally {
      fresh.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('preserves IDs, content, schedules and reviews; assigns explicitly and merges tags', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'fcards-legacy-'));
    const source = createClient({ url: `file:${directory}/source.db` });
    try {
      await source.executeMultiple(
        readFileSync('__tests__/fixtures/legacy-schema.sql', 'utf8'),
      );
      await source.executeMultiple(`
        INSERT INTO decks (id, name) VALUES (7, 'Legacy');
        INSERT INTO cards (id, deck_id, front, back, interval_raw, interval_days, reps) VALUES (8, 7, 'Old question', 'Old answer', 8.5, 9, 3);
        INSERT INTO notes (id, kind, title, body) VALUES (9, 'note', 'Old note', 'Text');
        INSERT INTO tags (id, name) VALUES (10, 'shared');
        INSERT INTO card_tags VALUES (8, 10);
        INSERT INTO note_tags VALUES (9, 10);
        INSERT INTO reviews (id, card_id, grade, due_at, interval_raw, interval_days, ease_factor) VALUES (11, 8, 'good', 12345, 8.5, 9, 2.5);
      `);
      await source.executeMultiple(
        'CREATE TABLE __drizzle_migrations (id integer); INSERT INTO __drizzle_migrations VALUES (1), (2), (3);',
      );
      const original = (await source.execute('SELECT * FROM cards')).rows[0];
      const history = (await source.execute('SELECT * FROM reviews')).rows;
      await importLegacy(source, client);
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name = '__drizzle_migrations'",
          )
        ).rows,
      ).toEqual([]);
      expect(
        (await client.execute('SELECT * FROM cards')).rows[0],
      ).toMatchObject(original);
      expect((await client.execute('SELECT * FROM reviews')).rows).toEqual(
        history,
      );
      expect(await loadItems('alice')).toEqual([]);
      expect(await loadItems('bob')).toEqual([]);
      await gradeCard(8, 'again');
      await deleteItem('card', 8);
      expect(await saveItem(draft(), { type: 'card', id: 8 })).toEqual({
        ok: false,
        error: 'Item not found',
      });
      await expect(assignOwner(client, 'unknown')).rejects.toThrow(
        'Sign in with GitHub',
      );
      await saveItem(draft()); // A duplicate tag name already owned by Alice.
      await assignOwner(client, 'alice');
      expect(await loadItems('alice')).toHaveLength(3);
      expect(await loadItems('bob')).toEqual([]);
      expect((await client.execute('SELECT * FROM reviews')).rows).toEqual(
        history,
      );
      expect((await client.execute('SELECT * FROM tags')).rows).toHaveLength(1);
      expect(
        (await client.execute('SELECT user_id FROM decks')).rows[0].user_id,
      ).toBe('alice');
      const before = await snapshot();
      await assignOwner(client, 'bob');
      expect(await snapshot()).toEqual(before);
      await expect(importLegacy(source, client)).rejects.toThrow(
        'Destination content must be empty',
      );
      expect(await snapshot()).toEqual(before);
      expect((await source.execute('SELECT * FROM cards')).rows[0]).toEqual(
        original,
      );
      expect((await client.execute('PRAGMA foreign_key_check')).rows).toEqual(
        [],
      );
    } finally {
      source.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rolls back an import failure without leaving partial content', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'fcards-legacy-'));
    const source = createClient({ url: `file:${directory}/source.db` });
    try {
      await source.executeMultiple(
        readFileSync('__tests__/fixtures/legacy-schema.sql', 'utf8'),
      );
      await source.execute(
        "INSERT INTO decks (name) VALUES ('Must roll back')",
      );
      await source.execute('DROP TABLE notes');
      await expect(importLegacy(source, client)).rejects.toThrow();
      expect((await client.execute('SELECT * FROM decks')).rows).toEqual([]);
    } finally {
      source.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
