import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { NoteNode } from '../../domain/note-node.js';
import { SqliteNodeRepository } from './sqlite-node-repository.js';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '../database/client.js';

const nodes = [
  {
    type: 'note' as const,
    title: 'Computer Science',
    isPublic: false,
    data: { content: 'Computer science is the study of computers!' },
  },
  {
    type: 'note' as const,
    title: 'Quantum Computing',
    isPublic: false,
    data: { content: 'Quantum computing is the study of qubits!' },
  },
  {
    type: 'note' as const,
    title: 'Chemistry',
    isPublic: false,
    data: { content: 'Chemistry is the study of molecules!' },
  },
];

describe('SqliteNodeRepository', () => {
  let db: DatabaseClient;
  let repository: SqliteNodeRepository;
  let dbFile: string;

  beforeEach(async () => {
    // Use a temp file vs in memory to allow for transactions to work
    dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });

    const mapper = new NodeMapper();
    repository = new SqliteNodeRepository(db, mapper);
  });

  afterEach(async () => {
    // best-effort cleanup
    try {
      await fs.unlink(dbFile);
    } catch {}
  });

  test('node is saved', async () => {
    const node = NoteNode.create({
      title: nodes[0]!.title,
      isPublic: nodes[0]!.isPublic,
      data: nodes[0]!.data,
    });

    await expect(repository.save(node)).resolves.not.toThrow();
  });

  // test('node (with edges) is saved', async () => {
  //   // First create & save the target node
  //   const targetNode = factory.createNode(
  //     nodes[1]!.type,
  //     nodes[1]!.title,
  //     nodes[1]!.isPublic,
  //     nodes[1]!.data
  //   );
  //   await repository.save(targetNode);

  //   const node = factory.createNode(
  //     nodes[0]!.type,
  //     nodes[0]!.title,
  //     nodes[0]!.isPublic,
  //     nodes[0]!.data
  //   );
  //   node.createEdge(targetNode.id);

  //   await expect(repository.save(node)).resolves.not.toThrow();
  // });

  test('node is retrieved by ID', async () => {
    const node = NoteNode.create({
      title: nodes[0]!.title,
      isPublic: nodes[0]!.isPublic,
      data: nodes[0]!.data,
    });
    await repository.save(node);
    const result = await repository.findById(node.id);

    expect(result).toBeDefined();
    expect(result).toEqual(node);
  });

  test('all nodes retrieved', async () => {
    for (const n of nodes) {
      const node = NoteNode.create({
        title: n.title,
        isPublic: n.isPublic,
        data: n.data,
      });
      await repository.save(node);
    }
    const results = await repository.findAll();

    expect(results.length).toEqual(nodes.length);
  });

  test('nodes are replicated in the FTS virtual table', async () => {
    for (const n of nodes) {
      const node = NoteNode.create({
        title: n.title,
        isPublic: n.isPublic,
        data: n.data,
      });
      await repository.save(node);
    }
    const { rows } = await db.run(sql`SELECT * FROM nodes_fts`);

    expect(rows.length).toBe(3);
  });

  test('deleting a node removes it from the FTS virtual table', async () => {
    const node = NoteNode.create({
      title: 'Temp',
      isPublic: false,
      data: { content: 'temp' },
    });
    await repository.save(node);
    await repository.delete(node.id);
    const { rows } = await db.run(
      sql`SELECT * FROM nodes_fts WHERE id = ${node.id}`
    );
    expect(rows.length).toBe(0);
  });

  test('full text search returns matches for relevant queries', async () => {
    for (const n of nodes) {
      const node = NoteNode.create({
        title: n.title,
        isPublic: n.isPublic,
        data: n.data,
      });
      await repository.save(node);
    }

    const results = await repository.search('computers');
    expect(results.length).toBeGreaterThan(0);
  });

  test('full text search handles multiple matches', async () => {
    const first = NoteNode.create({
      title: 'Dog Training',
      isPublic: false,
      data: { content: 'All about training your dog' },
    });
    const second = NoteNode.create({
      title: 'Dog Breeds',
      isPublic: false,
      data: { content: 'Different kinds of dogs' },
    });

    await repository.save(first);
    await repository.save(second);

    const results = await repository.search('dog');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.node.id).sort()).toEqual(
      [first.id, second.id].sort()
    );
  });

  test('full text search returns zero matches for irrelevant queries', async () => {
    for (const n of nodes) {
      const node = NoteNode.create({
        title: n.title,
        isPublic: n.isPublic,
        data: n.data,
      });
      await repository.save(node);
    }

    const results = await repository.search('irrelevant');
    expect(results.length).toBe(0);
  });

  test('search with relations returns related nodes', async () => {
    const parent = NoteNode.create({
      title: 'Parent',
      isPublic: false,
      data: { content: 'Parent node' },
    });
    const child = NoteNode.create({
      title: 'Child',
      isPublic: false,
      data: { content: 'Child node' },
    });

    await repository.save(parent);
    await repository.save(child);
    await repository.link(parent.id, child.id, 'contains', false);

    const results = await repository.search('Parent', true);
    expect(results[0]?.node.relatedNodes).toHaveLength(1);
    expect(results[0]?.node.relatedNodes[0]?.node.id).toBe(child.id);
  });

  test('bidirectional relationships are retrieved', async () => {
    const first = NoteNode.create({
      title: 'First',
      isPublic: false,
      data: { content: 'First node' },
    });
    const second = NoteNode.create({
      title: 'Second',
      isPublic: false,
      data: { content: 'Second node' },
    });

    await repository.save(first);
    await repository.save(second);
    await repository.link(first.id, second.id, 'related_to', true);

    const retrievedFirst = await repository.findById(first.id, true);
    const retrievedSecond = await repository.findById(second.id, true);

    expect(retrievedFirst?.relatedNodes).toHaveLength(1);
    expect(retrievedFirst?.relatedNodes[0]?.node.id).toBe(second.id);
    expect(retrievedFirst?.relatedNodes[0]?.relationship).toEqual({
      type: 'related_to',
      direction: 'both',
    });

    expect(retrievedSecond?.relatedNodes).toHaveLength(1);
    expect(retrievedSecond?.relatedNodes[0]?.node.id).toBe(first.id);
    expect(retrievedSecond?.relatedNodes[0]?.relationship).toEqual({
      type: 'related_to',
      direction: 'both',
    });
  });

  test('non-bidirectional relationships are retrieved', async () => {
    const parent = NoteNode.create({
      title: 'Parent',
      isPublic: false,
      data: { content: 'Parent node' },
    });
    const child = NoteNode.create({
      title: 'Child',
      isPublic: false,
      data: { content: 'Child node' },
    });

    await repository.save(parent);
    await repository.save(child);

    await repository.link(parent.id, child.id, 'contains', false);

    const retrievedParent = await repository.findById(parent.id, true);
    const retrievedChild = await repository.findById(child.id, true);

    expect(retrievedParent?.relatedNodes).toHaveLength(1);
    expect(retrievedParent?.relatedNodes[0]?.node.id).toBe(child.id);
    expect(retrievedParent?.relatedNodes[0]?.relationship).toEqual({
      type: 'contains',
      direction: 'from',
    });

    expect(retrievedChild?.relatedNodes).toHaveLength(1);
    expect(retrievedChild?.relatedNodes[0]?.node.id).toBe(parent.id);
    expect(retrievedChild?.relatedNodes[0]?.relationship).toEqual({
      type: 'contains',
      direction: 'to',
    });
  });
});
