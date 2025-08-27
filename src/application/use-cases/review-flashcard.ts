import type { NodeRepository } from '../ports/node-repository.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';
import { Result } from '../../shared/result.js';

class ReviewFlashcardUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: {
    flashcard: FlashcardNode;
    quality: number;
  }): Promise<Result<FlashcardNode, Error>> {
    try {
      const updated = input.flashcard.review(input.quality);
      await this.repository.update(updated);
      return Result.success(updated);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { ReviewFlashcardUseCase };
