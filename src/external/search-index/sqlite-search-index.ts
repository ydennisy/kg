import { sql } from 'drizzle-orm';
import type { DatabaseClient } from '../database/client.js';
import type { SearchIndex } from '../../application/ports/search-index.js';
import type { AnyNode } from '../../domain/types.js';

class SqliteSearchIndex implements SearchIndex {
  constructor(private readonly db: DatabaseClient) {}

  async indexNode(node: AnyNode): Promise<void> {
    await this.db.run(sql`DELETE FROM nodes_fts WHERE id = ${node.id}`);
    await this.db.run(
      sql`INSERT INTO nodes_fts(id, title, searchable_content, type) VALUES (${node.id}, ${node.title}, ${node.searchableContent}, ${node.type})`
    );
  }

  async removeNode(id: string): Promise<void> {
    await this.db.run(sql`DELETE FROM nodes_fts WHERE id = ${id}`);
  }
}

export { SqliteSearchIndex };
