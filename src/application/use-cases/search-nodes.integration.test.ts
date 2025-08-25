import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDatabaseClient, type DatabaseClient } from '../../external/database/client.js';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { SearchNodesUseCase } from './search-nodes.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';

function assertOk<T>(
  result: { ok: true; result: T } | { ok: false; error: string }
): asserts result is { ok: true; result: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

function first<T>(arr: readonly T[]): T {
  const item = arr[0];
  if (item === undefined) throw new Error('expected at least one item');
  return item;
}

describe('SearchNodesUseCase (integration)', () => {
  let db: DatabaseClient;
  let dbFile: string;
  let repository: SqliteNodeRepository;
  let useCase: SearchNodesUseCase;

  beforeEach(async () => {
    dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });
    repository = new SqliteNodeRepository(db, new NodeMapper());
    useCase = new SearchNodesUseCase(repository);
  });

  afterEach(async () => {
    try {
      await fs.unlink(dbFile);
    } catch {}
  });

  test('returns matching nodes for query', async () => {
    const note = NoteNode.create({
      title: 'Test Note',
      isPublic: false,
      data: { content: 'Some important content' },
    });
    await repository.save(note);

    const result = await useCase.execute({ query: 'important' });
    assertOk(result);
    const hit = first(result.result);
    expect(hit.node.id).toBe(note.id);
  });

  test('returns multiple node types', async () => {
    const note = NoteNode.create({
      title: 'Computer Science',
      isPublic: false,
      data: { content: 'Study of computers' },
    });
    const link = LinkNode.create({
      title: 'CS Resource',
      isPublic: true,
      data: {
        url: 'https://example.com',
        crawled: { title: 'Computer Science Guide', text: 'Guide', html: '<p>Guide</p>' },
      },
    });

    await repository.save(note);
    await repository.save(link);

    const result = await useCase.execute({ query: 'computer' });
    assertOk(result);
    expect(result.result).toHaveLength(2);
    const types = result.result.map((r) => r.node.type).sort();
    expect(types).toEqual(['link', 'note']);
  });

  test('includes related nodes when requested', async () => {
    const parent = NoteNode.create({
      title: 'Parent',
      isPublic: false,
      data: { content: 'Parent content' },
    });
    const child = NoteNode.create({
      title: 'Child',
      isPublic: false,
      data: { content: 'Child content' },
    });
    await repository.save(parent);
    await repository.save(child);
    await repository.link(parent.id, child.id, 'contains', false);

    const result = await useCase.execute({ query: 'Parent', withRelations: true });
    assertOk(result);
    const hit = first(result.result);
    const related = first(hit.node.relatedNodes);
    expect(related.node.id).toBe(child.id);
  });

  test('returns empty array for unmatched query', async () => {
    const note = NoteNode.create({
      title: 'Topic',
      isPublic: false,
      data: { content: 'Something else' },
    });
    await repository.save(note);

    const result = await useCase.execute({ query: 'unrelated' });
    assertOk(result);
    expect(result.result).toEqual([]);
  });
});
