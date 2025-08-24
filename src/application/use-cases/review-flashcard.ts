import type { NodeRepository } from '../ports/node-repository.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';

class ReviewFlashcardUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: {
    flashcard: FlashcardNode;
    quality: number;
  }): Promise<
    { ok: true; result: FlashcardNode } | { ok: false; error: string }
  > {
    try {
      const updated = input.flashcard.review(input.quality);
      await this.repository.update(updated);
      return { ok: true, result: updated };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { ReviewFlashcardUseCase };
