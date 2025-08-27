import type { NodeRepository } from '../ports/node-repository.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';
import { Result } from '../../shared/result.js';

class GetDueFlashcardsUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: {
    limit: number;
    date?: Date;
  }): Promise<Result<FlashcardNode[], Error>> {
    try {
      const cards = await this.repository.findDueFlashcards(
        input.date ?? new Date(),
        input.limit
      );
      return Result.success(cards);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { GetDueFlashcardsUseCase };
