import type {
  FlashcardGenerator,
  Flashcard,
} from '../ports/flashcard-generator.js';
import type { NodeRepository } from '../ports/node-repository.js';

type GenerateFlashcardsInput = {
  id: string;
};

class GenerateFlashcardsUseCase {
  constructor(
    private readonly repository: NodeRepository,
    private readonly flashcardGenerator: FlashcardGenerator
  ) {}

  async execute(
    input: GenerateFlashcardsInput
  ): Promise<
    { ok: true; result: Array<Flashcard> } | { ok: false; error: string }
  > {
    try {
      const node = await this.repository.findById(input.id, false);
      if (!node) {
        return { ok: false, error: 'Node not found' };
      }

      // TODO: handle different node types
      const flashcards = await this.flashcardGenerator.generate(
        (node as any).data?.text || ''
      );

      return { ok: true, result: flashcards };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { GenerateFlashcardsUseCase };
