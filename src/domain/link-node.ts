import { randomUUID } from 'node:crypto';

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

class LinkNode {
  readonly id: string;
  readonly type: 'link';
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  readonly data: LinkNodeData;
  private _title: string | undefined;

  constructor(input: LinkNodeProps) {
    this.id = input.id;
    this.type = 'link';
    this.version = input.version;
    this.createdAt = input.createdAt;
    this.updatedAt = input.updatedAt;
    this.isPublic = input.isPublic;
    this.data = input.data;
    this._title = input.title;
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
