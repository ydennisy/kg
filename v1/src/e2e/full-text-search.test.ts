import { describe, test, expect, beforeEach } from 'vitest';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { AjvValidator } from '../external/validation/ajv-validator.js';
import { NodeFactory } from '../domain/node-factory.js';
import { SqlNodeRepository } from '../external/repositories/sql-node-repository.js';
import { SqlEdgeRepository } from '../external/repositories/sql-edge-repository.js';
import { NodeMapper } from '../adapters/node-mapper.js';
import { EdgeMapper } from '../adapters/edge-mapper.js';
import { EdgeFactory } from '../domain/edge-factory.js';
import { CreateNodeUseCase } from '../application/use-cases/create-node.js';
import type { JSONSchema } from '../domain/ports/validator.js';

describe('Full Text Search E2E', () => {
  let nodeRepository: SqlNodeRepository;
  let edgeRepository: SqlEdgeRepository;
  let createNodeUseCase: CreateNodeUseCase;
  let edgeFactory: EdgeFactory;

  beforeEach(async () => {
    // Setup test dependencies
    const validator = new AjvValidator();
    const nodeFactory = new NodeFactory(validator);

    // Register schemas
    const noteSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    nodeFactory.registerSchema('note', noteSchema);
    nodeFactory.registerSchema('link', linkSchema);

    const nodeMapper = new NodeMapper(nodeFactory);
    edgeFactory = new EdgeFactory();
    const edgeMapper = new EdgeMapper(edgeFactory);

    // Create in-memory test database and run migrations
    const { createClient } = await import('@libsql/client');
    const { drizzle } = await import('drizzle-orm/libsql');
    const { nodesTable, edgesTable } = await import(
      '../external/database/schema.js'
    );
    const client = createClient({ url: ':memory:' });
    const db = drizzle(client, { schema: { nodesTable, edgesTable } });
    await migrate(db, { migrationsFolder: './drizzle' });

    nodeRepository = new SqlNodeRepository(db as any, nodeMapper);
    edgeRepository = new SqlEdgeRepository(db as any, edgeMapper);
    createNodeUseCase = new CreateNodeUseCase(nodeFactory, nodeRepository);
  });

  test('creates nodes, searches them, and creates links', async () => {
    // Step 1: Create test nodes
    const note1Result = await createNodeUseCase.execute({
      type: 'note',
      title: 'TypeScript Basics',
      data: { content: 'Learn about TypeScript types and interfaces' },
      isPublic: false,
    });

    const note2Result = await createNodeUseCase.execute({
      type: 'note',
      title: 'React Components',
      data: { content: 'Building functional components with hooks in React' },
      isPublic: false,
    });

    const linkResult = await createNodeUseCase.execute({
      type: 'link',
      title: 'TypeScript Docs',
      data: { url: 'https://www.typescriptlang.org/docs' },
      isPublic: false,
    });

    expect(note1Result.ok).toBe(true);
    expect(note2Result.ok).toBe(true);
    expect(linkResult.ok).toBe(true);

    if (!note1Result.ok || !note2Result.ok || !linkResult.ok) {
      throw new Error('Failed to create test nodes');
    }

    // Step 2: Test full text search functionality
    console.log('🔍 Testing search for "TypeScript"...');
    const typeScriptResults = await nodeRepository.searchNodes('TypeScript');

    expect(typeScriptResults.length).toBe(2); // note1 and link should match
    expect(typeScriptResults?[0].score).toBeDefined();
    expect(typeof typeScriptResults[0].score).toBe('number');

    // Should find both the note and the link
    const foundIds = typeScriptResults.map((r) => r.node.id);
    expect(foundIds).toContain(note1Result.node.id);
    expect(foundIds).toContain(linkResult.node.id);

    console.log('🔍 Testing search for "React"...');
    const reactResults = await nodeRepository.searchNodes('React');

    expect(reactResults.length).toBe(1); // Only note2 should match
    expect(reactResults[0].node.id).toBe(note2Result.node.id);
    expect(reactResults[0].score).toBeDefined();

    console.log('🔍 Testing search for "hooks"...');
    const hooksResults = await nodeRepository.searchNodes('hooks');

    expect(hooksResults.length).toBe(1); // Only note2 should match
    expect(hooksResults[0].node.id).toBe(note2Result.node.id);

    // Step 3: Test edge creation functionality
    console.log('🔗 Testing edge creation...');
    const edge = edgeFactory.createEdge(
      note1Result.node.id,
      linkResult.node.id
    );
    await edgeRepository.save(edge);

    // Verify edge was created
    const edges = await edgeRepository.findByNodeId(note1Result.node.id);
    expect(edges.length).toBe(1);
    expect(edges[0].sourceId).toBe(note1Result.node.id);
    expect(edges[0].targetId).toBe(linkResult.node.id);
    expect(edges[0].type).toBeNull(); // Should be null/empty as requested

    // Step 4: Test search results format for CLI display
    console.log('📋 Testing search result display format...');
    const displayResults = typeScriptResults.map(({ node, score }) => {
      const dataPreview = getNodeDataPreview(node);
      return `[${node.type.toUpperCase()}] ${
        node.title
      } - ${dataPreview} (Score: ${score.toFixed(2)})`;
    });

    expect(displayResults.length).toBe(2);
    expect(
      displayResults.some((d) => d.includes('[NOTE] TypeScript Basics'))
    ).toBe(true);
    expect(
      displayResults.some((d) => d.includes('[LINK] TypeScript Docs'))
    ).toBe(true);
    expect(displayResults.every((d) => d.includes('Score:'))).toBe(true);

    console.log('✅ All search and linking functionality working correctly!');
  });

  test('handles empty search queries gracefully', async () => {
    const results = await nodeRepository.searchNodes('');
    expect(results).toEqual([]);
  });

  test('handles non-matching search queries gracefully', async () => {
    // Create a test node first
    await createNodeUseCase.execute({
      type: 'note',
      title: 'Test Note',
      data: { content: 'This is a test note' },
      isPublic: false,
    });

    const results = await nodeRepository.searchNodes('nonexistent');
    expect(results).toEqual([]);
  });

  test('search results are ordered by relevance (BM25 score)', async () => {
    // Create nodes with different relevance to "TypeScript"
    await createNodeUseCase.execute({
      type: 'note',
      title: 'TypeScript TypeScript TypeScript', // High relevance - title has multiple matches
      data: { content: 'All about TypeScript TypeScript TypeScript' },
      isPublic: false,
    });

    await createNodeUseCase.execute({
      type: 'note',
      title: 'Some Programming Note', // Lower relevance - only one match in content
      data: { content: 'Mentions TypeScript briefly' },
      isPublic: false,
    });

    const results = await nodeRepository.searchNodes('TypeScript');
    expect(results.length).toBe(2);

    // First result should have a lower (better) BM25 score than the second
    expect(results[0].score).toBeLessThan(results[1].score);
  });
});

function getNodeDataPreview(node: any): string {
  const data = node.data;

  if (typeof data === 'string') {
    return data.slice(0, 50) + (data.length > 50 ? '...' : '');
  }

  if (typeof data === 'object' && data !== null) {
    // Try common preview fields
    const previewField = data.content || data.url || data.name || data.front;
    if (previewField && typeof previewField === 'string') {
      return (
        previewField.slice(0, 50) + (previewField.length > 50 ? '...' : '')
      );
    }

    // Fallback to JSON representation
    const jsonStr = JSON.stringify(data);
    return jsonStr.slice(0, 50) + (jsonStr.length > 50 ? '...' : '');
  }

  return 'No preview available';
}
