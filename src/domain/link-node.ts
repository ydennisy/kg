import { randomUUID } from 'node:crypto';
import { BaseNode } from './base-node.js';

type LinkNodeData = {
  url: string;
  crawled: {
    title: string | undefined;
    text: string | undefined;
    html: string | undefined;
  };
};

interface LinkNodeProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  title: string | undefined;
  data: LinkNodeData;
}

/**
 * Node representing a web link with optional crawled metadata.
 */
class LinkNode extends BaseNode {
  readonly type: 'link';
  private _title: string | undefined;
  readonly data: LinkNodeData;

  constructor(input: LinkNodeProps) {
    super(input);
    this.type = 'link';
    this._title = input.title;
    this.data = input.data;
  }

  /**
   * Gets the link's title or falls back to crawled data and URL.
   *
   * @returns Resolved link title.
   */
  get title() {
    return this._title || this.data.crawled.title || this.data.url;
  }

  get searchableContent() {
    return [
      this.data.url,
      this.data.crawled.title,
      this.data.crawled.text,
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Creates a new link node with generated id and timestamps.
   *
   * @param input Object containing visibility, optional title and link data.
   * @returns Newly created link node.
   */
  static create(input: {
    isPublic: boolean;
    title?: string | undefined;
    data: LinkNodeData;
  }): LinkNode {
    const id = randomUUID();
    const now = new Date();
    return new LinkNode({
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic,
      title: input.title,
      data: input.data,
    });
  }

  /**
   * Recreates a link node from persisted properties.
   *
   * @param input Complete link node properties.
   * @returns Hydrated link node instance.
   */
  static hydrate(input: LinkNodeProps): LinkNode {
    return new LinkNode(input);
  }
}

export { LinkNode };
