import { randomUUID } from 'node:crypto';
import { Edge, type EdgeType } from './edge.js';

type NodeType = 'note' | 'link' | 'tag' | 'flashcard';

class Node<T extends Record<string, any> = {}> {
  readonly id: string;
  readonly type: NodeType;
  readonly title: string;
  readonly isPublic: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly data: T;
  private _edges: Array<Edge> = [];

  constructor(
    id: string,
    type: NodeType,
    title: string,
    isPublic: boolean,
    createdAt: Date,
    updatedAt: Date,
    data: T
  ) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.isPublic = isPublic;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.data = data;
  }

  edges(): ReadonlyArray<Edge> {
    return this._edges;
  }

  addEdge(targetId: string, type?: EdgeType) {
    // TODO: should this check be in edge?
    if (this.id === targetId) {
      throw new Error('Cannot create self-referencing edge');
    }

    if (this._edges.some((edge) => edge.targetId === targetId)) return;
    // TODO: add create method or use factory?
    const edge = new Edge(randomUUID(), this.id, targetId, type, new Date());
    this._edges.push(edge);
  }
}

export { Node };
export type { NodeType };
