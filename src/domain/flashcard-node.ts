import { randomUUID } from 'node:crypto';

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

class FlashcardNode {
  readonly id: string;
  readonly type: 'flashcard';
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isPublic: boolean;
  readonly data: FlashcardNodeData;

  constructor(input: FlashcardNodeProps) {
    this.id = input.id;
    this.type = 'flashcard';
    this.version = input.version;
    this.createdAt = input.createdAt;
    this.updatedAt = input.updatedAt;
    this.isPublic = input.isPublic;
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
