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

/**
 * Node representing a tag used for categorizing other nodes.
 */
class TagNode extends BaseNode {
  readonly type: 'tag';
  readonly data: TagNodeData;

  constructor(input: TagNodeProps) {
    super(input);
    this.type = 'tag';
    this.data = input.data;
  }

  /**
   * Gets the tag's display name.
   *
   * @returns Tag name.
   */
  get title() {
    return this.data.name;
  }

  /**
   * Creates a new tag node with generated id and timestamps.
   *
   * @param input Object containing visibility and tag data.
   * @returns Newly created tag node.
   */
  static create(input: {
    isPublic: boolean;
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

  /**
   * Recreates a tag node from persisted properties.
   *
   * @param input Complete tag node properties.
   * @returns Hydrated tag node instance.
   */
  static hydrate(input: TagNodeProps): TagNode {
    return new TagNode(input);
  }
}

export { TagNode };
