import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { nodesTable, edgesTable } from '../database/schema.js';
import type { DatabaseClient } from '../database/client.js';
import type {
  NodeRepository,
  SearchResult,
} from '../../application/ports/node-repository.js';
import type { Node, EdgeType } from '../../domain/node.js';

export class SqlNodeRepository implements NodeRepository {
  constructor(private db: DatabaseClient, private mapper: NodeMapper) {}

  async save(node: Node): Promise<void> {
    // const edges = node.edges;

    const { id, type, title, isPublic, createdAt, updatedAt, data } =
      this.mapper.toPersistence(node);

    // TODO: figure out why adding a transactions throws an error that no table exists
    await this.db.insert(nodesTable).values({
      id,
      type,
      title,
      isPublic,
      createdAt,
      updatedAt,
      data,
    });
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

  async findAll(): Promise<Node[]> {
    const nodes = await this.db.select().from(nodesTable);
    return nodes.map((node) => this.mapper.toDomain(node));
  }

  async findById(id: string): Promise<Node | null> {
    // TODO: read up on the different query syntax Drizzle offers
    const node = await this.db.query.nodesTable.findFirst({
      where: eq(nodesTable.id, id),
      // For now we just return the node, no edges and nodes
      // with: {
      //   edgeSource: { with: { target: true } },
      //   edgeTarget: { with: { source: true } },
      // },
    });
    if (!node) return null; // should be undefined?

    return this.mapper.toDomain(node);
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

    // Uses FTS5 with BM25 scoring, a lower
    // BM25 scores indicates higher relevance
    // Very short terms (e.g., 1 char) won’t benefit from the 2/3-char prefix indexes and may be slower—consider dropping them or requiring ≥2 chars before appending *
    const results = await this.db.all(sql`
      SELECT DISTINCT
        n.id,
        n.type,
        n.title,
        n.is_public,
        n.created_at,
        n.updated_at,
        n.data,
        rank AS score,
        snippet(nodes_fts, -1, '<b>', '</b>', '…', 20) AS snippet -- Let SQLite pick title or data automatically, upto 20 tokens
      FROM nodes_fts
      JOIN nodes n 
        ON n.id = nodes_fts.id
      WHERE nodes_fts MATCH ${query}                      -- e.g. "quantum* compute*"
        AND rank MATCH 'bm25(0.0, 5.0, 1.0)'              -- id is UNINDEXED; weight title=5, data=1
      ORDER BY rank
      LIMIT 25
    `);

    return results.map((row: any) => ({
      node: this.mapper.toDomain({
        id: row.id,
        type: row.type,
        title: row.title,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: JSON.parse(row.data),
      }),
      snippet: row.snippet,
      score: Number(row.score),
    }));
  }
}
