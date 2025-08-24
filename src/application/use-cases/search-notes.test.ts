import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { SearchNodesUseCase } from './search-nodes.js';
import { NoteNode } from '../../domain/note-node.js';
import { LinkNode } from '../../domain/link-node.js';
import { createDatabaseClient } from '../../external/database/client.js';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { SqliteNodeRepository } from '../../external/repositories/sqlite-node-repository.js';
import type { NodeRepository, SearchResult } from '../ports/node-repository.js';
import { SqliteSearchIndex } from '../../external/search-index/sqlite-search-index.js';

describe('SearchNodesUseCase', () => {
  let mockRepository: NodeRepository;
  let useCase: SearchNodesUseCase;

  beforeEach(() => {
    mockRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      search: vi.fn(),
      link: vi.fn(),
      findDueFlashcards: vi.fn(),
    };

    useCase = new SearchNodesUseCase(mockRepository);
  });

  test('returns empty results for empty query', async () => {
    const result = await useCase.execute({ query: '' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual([]);
    }
    expect(mockRepository.search).not.toHaveBeenCalled();
  });

  test('returns search results without relations by default', async () => {
    const note = NoteNode.create({
      title: 'Test Note',
      isPublic: false,
      data: { content: 'Test content' },
    });

    const mockResults: SearchResult[] = [
      {
        node: note,
        snippet: 'Test <b>content</b>',
        score: 0.95,
      },
    ];

    vi.mocked(mockRepository.search).mockResolvedValue(mockResults);

    const result = await useCase.execute({ query: 'content' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual(mockResults);
    }
    expect(mockRepository.search).toHaveBeenCalledWith('content', undefined);
  });

  test('returns search results with relations when requested', async () => {
    const parentNote = NoteNode.create({
      title: 'Parent Note',
      isPublic: false,
      data: { content: 'Parent content' },
    });

    const childNote = NoteNode.create({
      title: 'Child Note',
      isPublic: false,
      data: { content: 'Child content' },
    });

    // Set up the relationship
    const relatedMap = new Map();
    relatedMap.set(childNote.id, {
      node: childNote,
      relationship: {
        type: 'contains',
        direction: 'from',
      },
    });
    parentNote.setRelatedNodes(relatedMap);

    const mockResults: SearchResult[] = [
      {
        node: parentNote,
        snippet: '<b>Parent</b> content',
        score: 0.9,
      },
    ];

    vi.mocked(mockRepository.search).mockResolvedValue(mockResults);

    const result = await useCase.execute({
      query: 'parent',
      withRelations: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toEqual(mockResults);
      expect(result.result[0].node.relatedNodes).toHaveLength(1);
      expect(result.result[0].node.relatedNodes[0].node.id).toBe(childNote.id);
    }
    expect(mockRepository.search).toHaveBeenCalledWith('parent', true);
  });

  test('handles repository errors gracefully', async () => {
    vi.mocked(mockRepository.search).mockRejectedValue(
      new Error('Database connection failed')
    );

    const result = await useCase.execute({ query: 'test' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Database connection failed');
    }
  });

  test('handles multiple node types in results', async () => {
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
        crawled: {
          title: 'Computer Science Guide',
          text: 'Complete guide to CS',
          html: '<p>Complete guide to CS</p>',
        },
      },
    });

    const mockResults: SearchResult[] = [
      {
        node: note,
        snippet: 'Study of <b>computers</b>',
        score: 0.95,
      },
      {
        node: link,
        snippet: '<b>Computer</b> Science Guide',
        score: 0.85,
      },
    ];

    vi.mocked(mockRepository.search).mockResolvedValue(mockResults);

    const result = await useCase.execute({ query: 'computer' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toHaveLength(2);
      expect(result.result[0].node.type).toBe('note');
      expect(result.result[1].node.type).toBe('link');
    }
  });

  test('preserves score ordering from repository', async () => {
    const highScoreNode = NoteNode.create({
      title: 'Exact Match',
      isPublic: false,
      data: { content: 'quantum computing' },
    });

    const mediumScoreNode = NoteNode.create({
      title: 'Partial Match',
      isPublic: false,
      data: { content: 'quantum mechanics and computing' },
    });

    const lowScoreNode = NoteNode.create({
      title: 'Weak Match',
      isPublic: false,
      data: { content: 'classical computing with quantum inspirations' },
    });

    const mockResults: SearchResult[] = [
      { node: highScoreNode, snippet: '<b>quantum computing</b>', score: 0.99 },
      {
        node: mediumScoreNode,
        snippet: '<b>quantum</b> mechanics',
        score: 0.75,
      },
      {
        node: lowScoreNode,
        snippet: 'classical <b>computing</b>',
        score: 0.45,
      },
    ];

    vi.mocked(mockRepository.search).mockResolvedValue(mockResults);

    const result = await useCase.execute({ query: 'quantum computing' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result[0].score).toBe(0.99);
      expect(result.result[1].score).toBe(0.75);
      expect(result.result[2].score).toBe(0.45);
    }
  });
});

describe('SearchNodesUseCase - Integration', () => {
  test('demonstrates missing automatic indexing (will fail without fix)', async () => {
    // TODO: move this code to some helper as it is used everywhere!
    const dbFile = path.join(os.tmpdir(), `${randomUUID()}.db`);
    const db = createDatabaseClient(`file:${dbFile}`);
    await migrate(db, { migrationsFolder: './drizzle' });

    const mapper = new NodeMapper();
    const repository = new SqliteNodeRepository(db, mapper);
    const searchIndex = new SqliteSearchIndex(db);
    const useCase = new SearchNodesUseCase(repository);

    const note = NoteNode.create({
      title: 'Test Note',
      isPublic: false,
      data: { content: 'Important content to search' },
    });
    await repository.save(note);
    await searchIndex.indexNode(note);

    const result = await useCase.execute({ query: 'important' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toHaveLength(1);
    }
  });
});
