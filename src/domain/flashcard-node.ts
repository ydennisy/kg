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

/**
 * Node representing a flashcard with front and back text.
 */
class FlashcardNode extends BaseNode {
  readonly type: 'flashcard';
  readonly data: FlashcardNodeData;

  constructor(input: FlashcardNodeProps) {
    super(input);
    this.type = 'flashcard';
    this.data = input.data;
  }

  /**
   * Gets the front text which acts as the flashcard's title.
   *
   * @returns Flashcard front text.
   */
  get title() {
    return this.data.front;
  }

  /**
   * Creates a new flashcard node with generated id and timestamps.
   *
   * @param input Object containing visibility and flashcard data.
   * @returns Newly created flashcard node.
   */
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

  /**
   * Recreates a flashcard node from persisted properties.
   *
   * @param input Complete flashcard node properties.
   * @returns Hydrated flashcard node instance.
   */
  static hydrate(input: FlashcardNodeProps): FlashcardNode {
    return new FlashcardNode(input);
  }
}

export { FlashcardNode };
