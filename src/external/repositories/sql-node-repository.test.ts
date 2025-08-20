import { describe, test, beforeEach, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { NodeFactory } from '../../domain/node-factory.js';
import { AjvValidator } from '../validation/ajv-validator.js';
import { SqlNodeRepository } from './sql-node-repository.js';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '../database/client.js';
import type { JSONSchema } from '../../domain/ports/validator.js';

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
  let factory: NodeFactory;

  beforeEach(async () => {
    db = createDatabaseClient(':memory:');
    await migrate(db, { migrationsFolder: './drizzle' });

    const validator = new AjvValidator();
    factory = new NodeFactory(validator);

    const noteSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('note', noteSchema);

    const mapper = new NodeMapper(factory);
    repository = new SqlNodeRepository(db, mapper);
  });

  test('node is saved', async () => {
    const node = factory.createNode(
      nodes[0]!.type,
      nodes[0]!.title,
      nodes[0]!.isPublic,
      nodes[0]!.data
    );

    await expect(repository.save(node)).resolves.not.toThrow();
  });

  test('node is retrieved by ID', async () => {
    const node = factory.createNode(
      nodes[0]!.type,
      nodes[0]!.title,
      nodes[0]!.isPublic,
      nodes[0]!.data
    );
    await repository.save(node);
    const result = await repository.findById(node.id);

    expect(result).toBeDefined();
    expect(result).toEqual(node);
  });

  test('all nodes retrieved', async () => {
    for (const n of nodes) {
      const node = factory.createNode(n.type, n.title, n.isPublic, n.data);
      await repository.save(node);
    }
    const results = await repository.findAll();

    expect(results.length).toEqual(nodes.length);
  });

  test('nodes are replicated in the FTS virtual table', async () => {
    for (const n of nodes) {
      const node = factory.createNode(n.type, n.title, n.isPublic, n.data);
      await repository.save(node);
    }
    const { rows } = await db.run(sql`SELECT * FROM nodes_fts`);

    expect(rows.length).toBe(3);
  });

  test('full text search returns matches for relevant queries', async () => {
    for (const n of nodes) {
      const node = factory.createNode(n.type, n.title, n.isPublic, n.data);
      await repository.save(node);
    }

    const results = await repository.search('computers');
    expect(results.length).toBeGreaterThan(0);
  });

  test('full text search returns zero matches for irrelevant queries', async () => {
    for (const n of nodes) {
      const node = factory.createNode(n.type, n.title, n.isPublic, n.data);
      await repository.save(node);
    }

    const results = await repository.search('irrelevant');
    expect(results.length).toBe(0);
  });
});
