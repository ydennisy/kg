import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { NodeMapper } from '../../adapters/node-mapper.js';
import {
  nodesTable,
  noteNodesTable,
  linkNodesTable,
  tagNodesTable,
  flashcardNodesTable,
  edgesTable,
} from '../database/schema.js';
import type { DatabaseClient } from '../database/client.js';
import type {
  NodeRepository,
  SearchResult,
} from '../../application/ports/node-repository.js';
import type { AnyNode, EdgeType } from '../../domain/types.js';

export class SqlNodeRepository implements NodeRepository {
  constructor(
    private db: DatabaseClient,
    private mapper: NodeMapper
  ) {}

  async save(node: AnyNode): Promise<void> {
    const { nodeRecord, typeRecord } = this.mapper.toRecords(node);

    // Insert into master nodes table
    await this.db.insert(nodesTable).values(nodeRecord);

    // Insert into appropriate type table
    switch (node.type) {
      case 'note':
        await this.db.insert(noteNodesTable).values(typeRecord);
        break;
      case 'link':
        await this.db.insert(linkNodesTable).values(typeRecord);
        break;
      case 'tag':
        await this.db.insert(tagNodesTable).values(typeRecord);
        break;
      case 'flashcard':
        await this.db.insert(flashcardNodesTable).values(typeRecord);
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  // TODO: this is temporary helper to add edges until it is handled properly in the domain
  async link(sourceId: string, targetId: string, type?: EdgeType) {
    await this.db.insert(edgesTable).values({
      id: randomUUID(),
      sourceId,
      targetId,
      type: type ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  async findAll(): Promise<AnyNode[]> {
    const results = await this.db.query.nodesTable.findMany({
      with: {
        noteNode: true,
        linkNode: true,
        tagNode: true,
        flashcardNode: true,
      },
    });

    return results.map((result) => this.mapper.toDomain(result as any));
  }

  async findById(id: string): Promise<AnyNode | null> {
    const result = await this.db.query.nodesTable.findFirst({
      where: eq(nodesTable.id, id),
      with: {
        noteNode: true,
        linkNode: true,
        tagNode: true,
        flashcardNode: true,
      },
    });

    if (!result) return null;

    return this.mapper.toDomain(result as any);
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Turns "quantum compute" into "quantum* compute*"
    const q = query
      .trim()
      .split(/\s+/)
      .map((t) => `${t}*`)
      .join(' ');

    // Uses FTS5 with BM25 scoring
    const results = await this.db.all(sql`
      SELECT DISTINCT
        n.id,
        n.type,
        n.title,
        n.version,
        n.is_public,
        n.created_at,
        n.updated_at,
        rank AS score,
        snippet(nodes_fts, -1, '<b>', '</b>', '…', 20) AS snippet
      FROM nodes_fts
      JOIN nodes n 
        ON n.id = nodes_fts.id
      WHERE nodes_fts MATCH ${q}
        AND rank MATCH 'bm25(0.0, 5.0, 1.0)'
      ORDER BY rank
      LIMIT 25
    `);

    // For each search result, we need to fetch the full node data with type-specific info
    const searchResults: SearchResult[] = [];

    for (const row of results) {
      const fullNode = await this.findById(row.id);
      if (fullNode) {
        searchResults.push({
          node: fullNode,
          snippet: row.snippet,
          score: Number(row.score),
        });
      }
    }

    return searchResults;
  }
}
