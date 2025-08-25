import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { SqliteSearchIndex } from '../../external/search-index/sqlite-search-index.js';
import { SearchNodesUseCase } from './search-nodes.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { createTestDatabase, type TestDatabase } from '../../../test/database.js';
import { assertOk } from '../../../test/assert.js';

function first<T>(arr: readonly T[]): T {
  const item = arr[0];
  if (item === undefined) throw new Error('expected at least one item');
  return item;
}

describe('SearchNodesUseCase (integration)', () => {
  let db: TestDatabase;
  let repository: SqliteNodeRepository;
  let searchIndex: SqliteSearchIndex;
  let useCase: SearchNodesUseCase;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new SqliteNodeRepository(db, new NodeMapper());
    searchIndex = new SqliteSearchIndex(db);
    useCase = new SearchNodesUseCase(repository);
  });

  afterEach(async () => {
    await db.cleanup();
  });

  test('returns matching nodes for query', async () => {
    const note = NoteNode.create({
      title: 'Test Note',
      isPublic: false,
      data: { content: 'Some important content' },
    });
    await repository.save(note);
    await searchIndex.indexNode(note);

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
    await searchIndex.indexNode(note);
    await searchIndex.indexNode(link);

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
    await searchIndex.indexNode(parent);
    await searchIndex.indexNode(child);

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
    await searchIndex.indexNode(note);

    const result = await useCase.execute({ query: 'unrelated' });
    assertOk(result);
    expect(result.result).toEqual([]);
  });
});
