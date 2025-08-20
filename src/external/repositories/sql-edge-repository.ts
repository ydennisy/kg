import { or, eq } from 'drizzle-orm';
import { Edge } from '../../domain/edge.js';
import { edgesTable } from '../database/schema.js';
import { EdgeMapper } from '../../adapters/edge-mapper.js';
import type { EdgeRepository } from '../../application/ports/edge-repository.js';
import type { DatabaseClient } from '../database/client.js';

export class SqlEdgeRepository implements EdgeRepository {
  constructor(private db: DatabaseClient, private mapper: EdgeMapper) {}

  async save(edge: Edge): Promise<void> {
    const record = this.mapper.toPersistence(edge);
    await this.db.insert(edgesTable).values(record);
  }

  async findByNodeId(nodeId: string): Promise<Edge[]> {
    const edges = await this.db
      .select()
      .from(edgesTable)
      .where(
        or(eq(edgesTable.sourceId, nodeId), eq(edgesTable.targetId, nodeId))
      );
    return edges.map((edge) => this.mapper.toDomain(edge));
  }
}
