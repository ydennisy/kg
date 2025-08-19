import { Edge, type EdgeType } from '../domain/edge.js';
import { EdgeFactory } from '../domain/edge-factory.js';
import type { EdgeRecord } from '../external/database/schema.js';

class EdgeMapper {
  constructor(private edgeFactory: EdgeFactory) {}

  toDomain(record: EdgeRecord): Edge {
    return this.edgeFactory.hydrateEdge(
      record.id,
      record.sourceId,
      record.targetId,
      record.type as EdgeType,
      new Date(record.createdAt)
    );
  }

  toPersistence(edge: Edge): EdgeRecord {
    return {
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type ?? null,
      createdAt: edge.createdAt.toISOString(),
    };
  }
}

export { EdgeMapper };
