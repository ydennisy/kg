import { randomUUID } from 'node:crypto';
import { BaseNode } from './base-node.js';

type FlashcardNodeData = {
  front: string;
  back: string;
};

interface FlashcardNodeProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  data: FlashcardNodeData;
}

class FlashcardNode extends BaseNode {
  readonly type: 'flashcard';
  readonly data: FlashcardNodeData;

  constructor(input: FlashcardNodeProps) {
    super(input);
    this.type = 'flashcard';
    this.data = input.data;
  }

  get title() {
    return this.data.front;
  }

  static create(input: {
    isPublic: boolean;
    title?: string;
    data: FlashcardNodeData;
  }): FlashcardNode {
    const id = randomUUID();
    const now = new Date();
    return new FlashcardNode({
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic,
      data: input.data,
    });
  }

  static hydrate(input: FlashcardNodeProps): FlashcardNode {
    return new FlashcardNode(input);
  }
}

export { FlashcardNode };
