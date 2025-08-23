import { randomUUID } from 'node:crypto';

type LinkNodeData = {
  url: string;
  title: string;
  text: string;
  html: string;
};

interface LinkNodeProps {
  id: string;
  type: 'link';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  title: string | undefined;
  data: LinkNodeData;
}

class LinkNode {
  constructor(input: LinkNodeProps) {}

  static create(input: {
    isPublic: boolean;
    title?: string;
    data: LinkNodeData;
  }): LinkNode {
    const id = randomUUID();
    const now = new Date();
    return new LinkNode({
      id,
      type: 'link',
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
