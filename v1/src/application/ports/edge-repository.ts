import { Edge, type EdgeType } from '../../domain/edge.js';

interface EdgeRepository {
  save(edge: Edge): Promise<void>;
  findByNodeId(nodeId: string): Promise<Edge[]>;
  // findBySourceNode(nodeId: string): Promise<Edge[]>;
  // findByTargetNode(nodeId: string): Promise<Edge[]>;
  // findByNodeId(nodeId: string): Promise<Edge[]>; // Both directions
  // findByType(type: EdgeType): Promise<Edge[]>;
  // findById(id: string): Promise<Edge | null>;
  // delete(id: string): Promise<void>;
}

export type { EdgeRepository };
