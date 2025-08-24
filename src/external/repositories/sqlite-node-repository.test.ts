import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { NoteNode } from '../../domain/note-node.js';
import { SqlNodeRepository } from './sqlite-node-repository.js';
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

describe('SQLNodeRepository', () => {
  let db: DatabaseClient;
  let repository: SqlNodeRepository;
  let dbFile: string;

  beforeEach(async () => {
    // Use a temp file vs in memory to allow for transactions to work
    dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });

    const mapper = new NodeMapper();
    repository = new SqlNodeRepository(db, mapper);
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
});
