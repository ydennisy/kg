import { randomUUID } from 'node:crypto';
import { BaseNode, type BaseNodeProps } from './base-node.js';

/**
 * Spaced repetition metadata stored alongside the flashcard text.
 *
 * The algorithm implemented in {@link FlashcardNode.review} is based on the
 * SuperMemo 2 (SM-2) algorithm used by systems like Anki. Each property tracks
 * the scheduling state of a single card:
 *
 * - `dueAt`: Absolute date when the card should be shown again.
 * - `interval`: Number of days until the next review. This grows as the card is
 *   successfully recalled.
 * - `easeFactor`: Multiplier that controls how quickly the `interval` grows.
 *   Easier cards end up with a higher ease factor and therefore longer
 *   intervals.
 * - `repetitions`: Count of consecutive successful reviews. Any failed review
 *   resets this to `0`.
 * - `lastReviewedAt`: Timestamp of the most recent review, or `null` if the
 *   card has never been reviewed.
 */
type FlashcardNodeData = {
  front: string;
  back: string;
  dueAt: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: Date | null;
};

interface FlashcardNodeProps extends BaseNodeProps {
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

  /**
   * Determines whether the card should be reviewed at the given time.
   *
   * A card is considered due when its scheduled `dueAt` timestamp is in the
   * past relative to the provided date (defaults to now).
   */
  isDue(on: Date = new Date()): boolean {
    return this.data.dueAt.getTime() <= on.getTime();
  }

  /**
   * Applies the SM‑2 spaced repetition algorithm to schedule the next review.
   *
   * @param quality Quality of recall rated from `0`‑`5` where `5` means perfect
   * recall. Values below `3` are treated as failures.
   * @returns A new `FlashcardNode` instance with updated scheduling metadata.
   *
   * The algorithm works as follows:
   *
   * 1. **Failure (`quality < 3`)** – the card is considered forgotten, the
   *    repetition count resets to `0` and the next review is scheduled for the
   *    very next day (`interval = 1`).
   * 2. **Success (`quality >= 3`)** – the repetition count increases and the
   *    review interval grows:
   *    - first successful review → 1 day
   *    - second successful review → 6 days
   *    - subsequent reviews → previous interval × ease factor
   * 3. **Ease factor adjustment** – after successful reviews the ease factor is
   *    updated using the SM‑2 formula
   *    `EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))`.
   *    The ease factor never drops below `1.3` to avoid overly short intervals.
   * 4. **Due date** – the next due date is calculated by adding the interval in
   *    days to the current time.
   */
  review(quality: number): FlashcardNode {
    const now = new Date();
    let { easeFactor, interval, repetitions } = this.data;

    if (quality < 3) {
      // Failed review: reset progress and schedule for tomorrow
      repetitions = 0;
      interval = 1;
    } else {
      // Successful review: increase repetition count and compute next interval
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1; // first successful review -> 1 day
      } else if (repetitions === 2) {
        interval = 6; // second success -> 6 days
      } else {
        interval = Math.round(interval * easeFactor); // later reviews -> previous interval scaled by ease
      }
      // Adjust ease factor based on quality; see algorithm doc above
      easeFactor =
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) {
        easeFactor = 1.3; // maintain minimum ease to prevent intervals collapsing
      }
    }

    // Schedule next review by adding the interval (in days) to the current time
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
