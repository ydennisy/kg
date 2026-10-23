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
vi.mock('@/lib/links/enrich', () => ({
  enrichLink: vi.fn(async () => ({
    title: 'Extracted title',
    summary: 'Explains associative memory.',
    keywords: 'retrieval cognition',
  })),
}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { createClient } = await import('@libsql/client');
  const { drizzle } = await import('drizzle-orm/libsql');
  const schema = await import('@/lib/db/schema');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  identity.directory = mkdtempSync(join(tmpdir(), 'kg-ownership-'));
  return {
    ...schema,
    db: drizzle(createClient({ url: `file:${identity.directory}/target.db` }), {
      schema,
    }),
  };
});

import { enrichLink } from '@/lib/links/enrich';
import { search } from '@/lib/knowledge/search';
import { db } from '@/lib/db';
import { saveItem, deleteItem, gradeCard, renameTag } from '@/app/actions';
import { loadItems } from '@/lib/knowledge/load';
import { assignOwner } from '../../scripts/lib/ownership';
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
  vi.mocked(enrichLink).mockClear();
  identity.id = 'alice';
  identity.signedIn = true;
  await client.execute('PRAGMA foreign_keys = OFF');
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const row of tables.rows)
    await client.execute(`DROP TABLE "${row.name}"`);
  await client.executeMultiple(baseline);
  for (const migration of [
    '0001_add_link_enrichment',
    '0002_add_tag_parents',
  ]) {
    await client.executeMultiple(
      readFileSync(`drizzle/${migration}.sql`, 'utf8'),
    );
  }
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

describe('fresh baseline and development seed ownership', () => {
  it('preserves existing links when adding enrichment columns', async () => {
    const legacy = createClient({ url: ':memory:' });
    try {
      await legacy.executeMultiple(baseline);
      await legacy.executeMultiple(`
        INSERT INTO notes (id, kind, title, body, url)
        VALUES (1, 'link', 'Saved title', 'Personal note', 'https://example.com');
      `);
      const before = (await legacy.execute('SELECT * FROM notes')).rows[0];
      await legacy.executeMultiple(
        readFileSync('drizzle/0001_add_link_enrichment.sql', 'utf8'),
      );
      expect((await legacy.execute('SELECT * FROM notes')).rows[0]).toEqual({
        ...before,
        summary: '',
        keywords: '',
      });
    } finally {
      legacy.close();
    }
  });

  it('applies all migrations through the migrator and can rerun them', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kg-baseline-'));
    const fresh = createClient({ url: `file:${directory}/fresh.db` });
    try {
      const { drizzle } = await import('drizzle-orm/libsql');
      const { migrate } = await import('drizzle-orm/libsql/migrator');
      const database = drizzle(fresh);
      await migrate(database, { migrationsFolder: 'drizzle' });
      await migrate(database, { migrationsFolder: 'drizzle' });
      expect(
        (await fresh.execute('SELECT * FROM __drizzle_migrations')).rows,
      ).toHaveLength(3);
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

  it('assigns unowned seed content and merges tags without changing other owners', async () => {
    await client.executeMultiple(`
      INSERT INTO decks (id, name) VALUES (7, 'Sample');
      INSERT INTO cards (id, deck_id, front, back) VALUES (8, 7, 'Question', 'Answer');
      INSERT INTO notes (id, kind, title, body) VALUES (9, 'note', 'Sample note', 'Text');
      INSERT INTO tags (id, name) VALUES (10, 'shared');
      INSERT INTO card_tags VALUES (8, 10);
      INSERT INTO note_tags VALUES (9, 10);
    `);
    expect(await loadItems('alice')).toEqual([]);
    await expect(assignOwner(client, 'unknown')).rejects.toThrow(
      'Sign in with GitHub',
    );
    await saveItem(draft());
    await assignOwner(client, 'alice');
    expect(await loadItems('alice')).toHaveLength(3);
    expect(await loadItems('bob')).toEqual([]);
    expect((await client.execute('SELECT * FROM tags')).rows).toHaveLength(1);
    expect(
      (await client.execute('SELECT user_id FROM decks')).rows[0].user_id,
    ).toBe('alice');
    const before = await snapshot();
    await assignOwner(client, 'bob');
    expect(await snapshot()).toEqual(before);
    expect((await client.execute('PRAGMA foreign_key_check')).rows).toEqual([]);
  });
});

describe('link enrichment through save and search', () => {
  it('fills missing titles, preserves notes and finds summary/keywords', async () => {
    await saveItem({ ...draft('link'), b: '', c: 'My own note' });
    const items = await loadItems('alice');
    expect(items[0]).toMatchObject({
      title: 'Extracted title',
      bodyMarkdown: 'My own note',
      summary: 'Explains associative memory.',
      keywords: 'retrieval cognition',
    });
    expect(
      search(items, { query: 'associative memory', tag: null }),
    ).toHaveLength(1);
    expect(search(items, { query: 'cognition', tag: null })).toHaveLength(1);
    expect(await loadItems('bob')).toEqual([]);
  });
  it('preserves supplied titles, avoids refetch on edits and clears stale metadata on URL change failure', async () => {
    await saveItem(draft('link'));
    const [item] = await loadItems('alice');
    expect(item.title).toBe('Private body');
    await saveItem(
      { ...draft('link'), c: 'Edited note' },
      { type: 'link', id: item.id },
    );
    expect(enrichLink).toHaveBeenCalledTimes(1);
    vi.mocked(enrichLink).mockResolvedValueOnce({
      title: '',
      summary: '',
      keywords: '',
    });
    await saveItem(
      { ...draft('link'), a: 'https://example.org', b: '' },
      { type: 'link', id: item.id },
    );
    expect((await loadItems('alice'))[0]).toMatchObject({
      title: 'example.org',
      summary: '',
      keywords: '',
    });
  });
  it('does not enrich unauthorized edits and clears metadata when converted to a note', async () => {
    await saveItem(draft('link'));
    const [item] = await loadItems('alice');
    identity.id = 'bob';
    expect(
      await saveItem(draft('link'), { type: 'link', id: item.id }),
    ).toEqual({ ok: false, error: 'Item not found' });
    expect(enrichLink).toHaveBeenCalledTimes(1);
    identity.id = 'alice';
    await saveItem(draft('note'), { type: 'link', id: item.id });
    expect((await loadItems('alice'))[0]).toMatchObject({
      type: 'note',
      summary: '',
      keywords: '',
    });
  });
});

describe('nested tags through real SQL', () => {
  const tagRows = async () =>
    (
      await client.execute(
        'SELECT id, parent_id, name, user_id FROM tags ORDER BY id',
      )
    ).rows.map((row) => ({ ...row }));
  const tagsOf = async (who = 'alice') =>
    (await loadItems(who)).map((item) => item.tags);

  it('saves a path as a chain of tags, sharing parents and dropping implied ones', async () => {
    await saveItem(draft('card', ['Programming/Databases', 'programming']));
    await saveItem(draft('note', ['programming/closures']));
    expect(await tagRows()).toEqual([
      { id: 1, parent_id: null, name: 'programming', user_id: 'alice' },
      { id: 2, parent_id: 1, name: 'databases', user_id: 'alice' },
      { id: 3, parent_id: 1, name: 'closures', user_id: 'alice' },
    ]);
    expect(await tagsOf()).toEqual([
      ['programming/databases'],
      ['programming/closures'],
    ]);
    expect(
      search(await loadItems('alice'), { query: '', tag: 'programming' }),
    ).toHaveLength(2);
  });

  it('allows the same name in different branches', async () => {
    await saveItem(draft('card', ['rust/closures', 'programming/closures']));
    expect((await tagsOf())[0]).toEqual([
      'programming/closures',
      'rust/closures',
    ]);
  });

  it('renames and moves a branch with everything under it', async () => {
    await saveItem(draft('card', ['programming/databases/sqlite']));
    expect(await renameTag('programming/databases', 'data/stores')).toEqual({
      ok: true,
      path: 'data/stores',
    });
    expect(await tagsOf()).toEqual([['data/stores/sqlite']]);
    expect(await renameTag('data', 'data/inside')).toEqual({
      ok: false,
      error: 'A tag cannot move inside itself',
    });
  });

  it('merges into a tag that already exists, children included', async () => {
    await saveItem(draft('card', ['db/sqlite', 'rl']));
    await saveItem(draft('note', ['programming/databases/sqlite']));
    await saveItem(draft('link', ['programming/databases/postgres']));
    expect(await renameTag('db', 'programming/databases')).toMatchObject({
      ok: true,
    });
    expect(await tagsOf()).toEqual([
      ['programming/databases/sqlite', 'rl'],
      ['programming/databases/sqlite'],
      ['programming/databases/postgres'],
    ]);
    const names = (await tagRows()).map((row) => row.name).sort();
    expect(names).toEqual([
      'databases',
      'postgres',
      'programming',
      'rl',
      'sqlite',
    ]);
  });

  it("cannot rename another user's tag", async () => {
    await saveItem(draft('card', ['secret']));
    identity.id = 'bob';
    expect(await renameTag('secret', 'mine')).toEqual({
      ok: false,
      error: 'Tag not found',
    });
    expect((await tagRows())[0].name).toBe('secret');
  });
});
