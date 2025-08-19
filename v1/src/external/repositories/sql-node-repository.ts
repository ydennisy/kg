import { eq } from 'drizzle-orm';
import { NodeMapper } from '../../adapters/node-mapper.js';
import { nodesTable } from '../database/schema.js';
import type { DatabaseClient } from '../database/client.js';
import type { NodeRepository } from '../../application/ports/node-repository.js';
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
}
