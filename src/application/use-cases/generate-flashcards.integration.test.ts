import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import { MockFlashcardGenerator } from '../../external/ai-services/mock-flashcard-generator.js';
import { GenerateFlashcardsUseCase } from './generate-flashcards.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { TagNode } from '../../domain/tag-node.js';
import { createTestDatabase, type TestDatabase } from '../../../test/database.js';
import { assertOk } from '../../../test/assert.js';

// Integration tests for GenerateFlashcardsUseCase

describe('GenerateFlashcardsUseCase (integration)', () => {
  let db: TestDatabase;
  let repository: SqliteNodeRepository;
  let generator: MockFlashcardGenerator;
  let useCase: GenerateFlashcardsUseCase;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new SqliteNodeRepository(db, new NodeMapper());
    generator = new MockFlashcardGenerator();
    useCase = new GenerateFlashcardsUseCase(repository, generator);
  });

  afterEach(async () => {
    await db.cleanup();
  });

  test('generates flashcards for note node', async () => {
    const note = NoteNode.create({
      title: 'Physics',
      isPublic: false,
      data: { content: 'Study of matter' },
    });
    await repository.save(note);

    const result = await useCase.execute({ id: note.id });
    assertOk(result);
    expect(result.result).toHaveLength(3);
  });

  test('generates flashcards for link node', async () => {
    const link = LinkNode.create({
      title: 'CS Resource',
      isPublic: false,
      data: {
        url: 'https://example.com',
        crawled: {
          title: 'CS',
          text: 'Computer science resource',
          html: '<p>CS</p>',
        },
      },
    });
    await repository.save(link);

    const result = await useCase.execute({ id: link.id });
    assertOk(result);
    expect(result.result).toHaveLength(3);
  });

  test('returns error when node does not exist', async () => {
    const result = await useCase.execute({ id: 'missing' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Node not found');
    }
  });

  test('returns error for unsupported node type', async () => {
    const tag = TagNode.create({
      isPublic: false,
      data: { name: 'tag' },
    });
    await repository.save(tag);

    const result = await useCase.execute({ id: tag.id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'Flashcards can be generated only from `note` or `link` node types'
      );
    }
  });
});
