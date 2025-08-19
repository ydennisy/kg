type EdgeType =
  | 'references'
  | 'contains'
  | 'tagged_with'
  | 'similar_to'
  | 'responds_to';

class Edge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly type?: EdgeType;
  readonly createdAt: Date;

  constructor(
    id: string,
    sourceId: string,
    targetId: string,
    type: EdgeType,
    createdAt: Date
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type;
    this.createdAt = createdAt;
  }
}

export { Edge };
export type { EdgeType };
