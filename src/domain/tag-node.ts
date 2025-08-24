import { randomUUID } from 'node:crypto';
import { BaseNode } from './base-node.js';

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

class TagNode extends BaseNode {
  readonly type: 'tag';
  readonly data: TagNodeData;

  constructor(input: TagNodeProps) {
    super(input);
    this.type = 'tag';
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
