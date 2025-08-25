import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { GetNodeUseCase } from './get-node.js';
import { NoteNode } from '../../domain/note-node.js';
import { createTestDatabase, type TestDatabase } from '../../../test/database.js';
import { assertOk } from '../../../test/assert.js';

describe('GetNodeUseCase (integration)', () => {
  let db: TestDatabase;
  let repository: SqliteNodeRepository;
  let useCase: GetNodeUseCase;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new SqliteNodeRepository(db, new NodeMapper());
    useCase = new GetNodeUseCase(repository);
  });

  afterEach(async () => {
    await db.cleanup();
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
