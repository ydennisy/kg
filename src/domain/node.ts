// import { randomUUID } from 'node:crypto';
// import { Edge, type EdgeType } from './edge.js';

type NodeType = 'note' | 'link' | 'tag' | 'flashcard';
type EdgeType =
  | 'references'
  | 'contains'
  | 'tagged_with'
  | 'similar_to'
  | 'responds_to';
// type Edge = {
//   id: string;
//   sourceId: string;
//   targetId: string;
//   type: EdgeType | undefined;
//   createdAt: Date;
// };

class Node<T extends Record<string, any> = {}> {
  readonly id: string;
  readonly type: NodeType;
  readonly title: string;
  readonly isPublic: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly data: T;

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

  // get edges(): ReadonlyArray<Edge> {
  //   return this._edges;
  // }

  // createEdge(targetId: string, type?: EdgeType) {
  //   // TODO: should this check be in edge?
  //   if (this.id === targetId) {
  //     throw new Error('Cannot create self-referencing edge');
  //   }

  //   // No-op if edge exists
  //   if (this._edges.some((edge) => edge.targetId === targetId)) return;

  //   const edge = {
  //     id: randomUUID(),
  //     sourceId: this.id,
  //     targetId,
  //     type,
  //     createdAt: new Date(),
  //   };
  //   this._edges.push(edge);
  // }

  // // TODO: add invariants!
  // hydrateEdge(edge: Edge) {
  //   this._edges.push(edge);
  // }
}

export { Node };
export type { NodeType, EdgeType };
