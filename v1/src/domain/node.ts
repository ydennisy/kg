type NodeType = 'note' | 'link' | 'tag' | 'flashcard';

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
}

export { Node };
export type { NodeType };
