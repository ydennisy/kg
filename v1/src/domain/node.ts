type NodeType = 'link' | 'flashcard' | 'idea' | 'atom';

class Node<T extends Record<string, any> = {}> {
  readonly id: string;
  readonly type: NodeType;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly tags: Array<string>;
  readonly isPublic: boolean;
  readonly data: T;

  constructor(
    id: string,
    type: NodeType,
    createdAt: Date,
    updatedAt: Date,
    tags: Array<string>,
    isPublic: boolean,
    data: T
  ) {
    this.id = id;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.tags = tags;
    this.isPublic = isPublic;
    this.data = data;
  }
}

export { Node };
export type { NodeType };
