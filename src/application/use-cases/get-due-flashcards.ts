import type { NodeRepository } from '../ports/node-repository.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';

class GetDueFlashcardsUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: {
    limit: number;
    date?: Date;
  }): Promise<
    { ok: true; result: FlashcardNode[] } | { ok: false; error: string }
  > {
    try {
      const cards = await this.repository.findDueFlashcards(
        input.date ?? new Date(),
        input.limit
      );
      return { ok: true, result: cards };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { GetDueFlashcardsUseCase };
