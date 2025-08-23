import { randomUUID } from 'node:crypto';

type TagNodeData = {
  name: string;
};

interface TagNodeProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  data: TagNodeData;
}

class TagNode {
  readonly id: string;
  readonly type: 'tag';
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  readonly data: TagNodeData;

  constructor(input: TagNodeProps) {
    this.id = input.id;
    this.type = 'tag';
    this.version = input.version;
    this.createdAt = input.createdAt;
    this.updatedAt = input.updatedAt;
    this.isPublic = input.isPublic;
    this.data = input.data;
  }

  get title() {
    return this.data.name;
  }

  static create(input: {
    isPublic: boolean;
    title?: string;
    data: TagNodeData;
  }): TagNode {
    const id = randomUUID();
    const now = new Date();
    return new TagNode({
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic,
      data: input.data,
    });
  }

  static hydrate(input: TagNodeProps): TagNode {
    return new TagNode(input);
  }
}

export { TagNode };
