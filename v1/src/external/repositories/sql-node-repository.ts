import { eq, sql } from 'drizzle-orm';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { nodesTable } from '../database/schema.js';
import type { DatabaseClient } from '../database/client.js';
import type { NodeRepository, SearchResult } from '../../application/ports/node-repository.js';
import type { Node } from '../../domain/node.js';

export class SqlNodeRepository implements NodeRepository {
  constructor(private db: DatabaseClient, private mapper: NodeMapper) {}

  async save(node: Node): Promise<void> {
    const { id, type, title, isPublic, createdAt, updatedAt, data } =
      this.mapper.toPersistence(node);

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

  async findAll(): Promise<Node[]> {
    const nodes = await this.db.select().from(nodesTable);
    return nodes.map((node) => this.mapper.toDomain(node));
  }

  async findById(id: string): Promise<Node | null> {
    const [node] = await this.db
      .select()
      .from(nodesTable)
      .where(eq(nodesTable.id, id))
      .limit(1);

    if (!node) return null; // should be undefined?

    return this.mapper.toDomain(node);
  }

  async searchNodes(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Manually sync existing nodes to FTS table (since triggers are missing from migration)
    const nodes = await this.db.all(sql`SELECT id, title, data FROM nodes`);
    for (const node of nodes) {
      await this.db.run(sql`INSERT OR REPLACE INTO nodes_fts(id, title, data) VALUES (${node.id}, ${node.title}, ${node.data})`);
    }

    // Use FTS5 with BM25 scoring
    // Lower BM25 scores indicate higher relevance
    const results = await this.db.all(sql`
      SELECT DISTINCT
        n.id, n.type, n.title, n.is_public, n.created_at, n.updated_at, n.data,
        bm25(nodes_fts) as score
      FROM nodes_fts 
      JOIN nodes n ON n.id = nodes_fts.id
      WHERE nodes_fts MATCH ${query}
      ORDER BY bm25(nodes_fts)
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
      score: Number(row.score),
    }));
  }
}
