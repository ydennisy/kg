import { randomUUID } from 'node:crypto';
import { BaseNode } from './base-node.js';

type FlashcardNodeData = {
  front: string;
  back: string;
  dueAt: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: Date | null;
};

interface FlashcardNodeProps {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  data: FlashcardNodeData;
}

type FlashcardNodeInputData = {
  front: string;
  back: string;
};

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

  get searchableContent() {
    return `${this.data.front} ${this.data.back}`;
  }

  /**
   * Creates a new flashcard node with generated id and timestamps.
   *
   * @param input Object containing visibility and flashcard data.
   * @returns Newly created flashcard node.
   */
  static create(input: {
    isPublic: boolean;
    data: FlashcardNodeInputData;
  }): FlashcardNode {
    const id = randomUUID();
    const now = new Date();
    return new FlashcardNode({
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic,
      data: {
        front: input.data.front,
        back: input.data.back,
        dueAt: now,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lastReviewedAt: null,
      },
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

  isDue(on: Date = new Date()): boolean {
    return this.data.dueAt.getTime() <= on.getTime();
  }

  review(quality: number): FlashcardNode {
    const now = new Date();
    let { easeFactor, interval, repetitions } = this.data;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      easeFactor =
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) {
        easeFactor = 1.3;
      }
    }

    const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return FlashcardNode.hydrate({
      id: this.id,
      version: this.version + 1,
      createdAt: this.createdAt,
      updatedAt: now,
      isPublic: this.isPublic,
      data: {
        front: this.data.front,
        back: this.data.back,
        dueAt,
        interval,
        easeFactor,
        repetitions,
        lastReviewedAt: now,
      },
    });
  }
}

export { FlashcardNode };
