import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDatabaseClient, type DatabaseClient } from '../../external/database/client.js';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { GetNodeUseCase } from './get-node.js';
import { NoteNode } from '../../domain/note-node.js';

function assertOk<T>(
  result: { ok: true; result: T } | { ok: false; error: string }
): asserts result is { ok: true; result: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

describe('GetNodeUseCase (integration)', () => {
  let db: DatabaseClient;
  let dbFile: string;
  let repository: SqliteNodeRepository;
  let useCase: GetNodeUseCase;

  beforeEach(async () => {
    dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });
    repository = new SqliteNodeRepository(db, new NodeMapper());
    useCase = new GetNodeUseCase(repository);
  });

  afterEach(async () => {
    try {
      await fs.unlink(dbFile);
    } catch {}
  });

  test('retrieves node by id', async () => {
    const note = NoteNode.create({
      title: 'Test',
      isPublic: false,
      data: { content: 'content' },
    });
    await repository.save(note);

    const result = await useCase.execute({ id: note.id });
    assertOk(result);
    expect(result.result.id).toBe(note.id);
  });

  test('returns error when node does not exist', async () => {
    const result = await useCase.execute({ id: randomUUID() });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Node not found');
    }
  });

  test('does not include related nodes by default', async () => {
    const parent = NoteNode.create({
      title: 'Parent',
      isPublic: false,
      data: { content: 'parent' },
    });
    const child = NoteNode.create({
      title: 'Child',
      isPublic: false,
      data: { content: 'child' },
    });
    await repository.save(parent);
    await repository.save(child);
    await repository.link(parent.id, child.id, 'contains', false);

    const result = await useCase.execute({ id: parent.id });
    assertOk(result);
    expect(result.result.relatedNodes).toHaveLength(0);
  });
});
