import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { CreateNodeUseCase } from './create-node.js';
import type { Crawler } from '../ports/crawler.js';
import { createTestDatabase, type TestDatabase } from '../../../test/database.js';
import { assertOk } from '../../../test/assert.js';

describe('CreateNodeUseCase (integration)', () => {
  let db: TestDatabase;
  let repository: SqliteNodeRepository;
  let useCase: CreateNodeUseCase;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new SqliteNodeRepository(db, new NodeMapper());
    const crawler: Crawler = {
      fetch: async (url: string) => ({
        url,
        title: 'Example',
        text: 'Example',
        markdown: 'Example',
        html: '<p>Example</p>',
      }),
    };
    useCase = new CreateNodeUseCase(repository, crawler);
  });

  afterEach(async () => {
    await db.cleanup();
  });

  test('persists a note node', async () => {
    const result = await useCase.execute({
      type: 'note',
      title: 'Integration Note',
      isPublic: false,
      data: { content: 'Some content' },
    });
    assertOk(result);

    const stored = await repository.findById(result.result.id);
    expect(stored?.title).toBe('Integration Note');
  });

  test('persists a link node with crawled data', async () => {
    const result = await useCase.execute({
      type: 'link',
      isPublic: true,
      data: { url: 'https://example.com' },
    });
    assertOk(result);

    const stored = await repository.findById(result.result.id);
    expect(stored?.id).toBe(result.result.id);
    if (stored && stored.type === 'link') {
      expect(stored.data.crawled.title).toBe('Example');
    } else {
      throw new Error('expected link node');
    }
  });
});

