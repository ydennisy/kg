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

  get title() {
    return this._title || this.data.crawled.title || this.data.url;
  }

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

  static hydrate(input: LinkNodeProps): LinkNode {
    return new LinkNode(input);
  }
}

export { LinkNode };
