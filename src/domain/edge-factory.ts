import { randomUUID } from 'node:crypto';
import { Edge, type EdgeType } from './edge.js';

class EdgeFactory {
  createEdge(sourceId: string, targetId: string, type?: EdgeType): Edge {
    if (sourceId === targetId) {
      throw new Error('Cannot create self-referencing edge');
    }

    const id = randomUUID();
    const createdAt = new Date();
    return new Edge(id, sourceId, targetId, type, createdAt);
  }

  hydrateEdge(
    id: string,
    sourceId: string,
    targetId: string,
    type: EdgeType | undefined,
    createdAt: Date
  ): Edge {
    return new Edge(id, sourceId, targetId, type, createdAt);
  }
}

export { EdgeFactory };
