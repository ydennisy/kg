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

      let text: string;
      let flashcards: Array<Flashcard>;

      // TODO: we have to check that the link has been crawled successfully
      if (node.type === 'link') {
        text = `${node.title} | ${node.data.crawled.text}`;
        flashcards = await this.flashcardGenerator.generate(text);
      } else if (node.type === 'note') {
        text = `${node.title} | ${node.data.content}`;
        flashcards = await this.flashcardGenerator.generate(text);
      } else {
        return {
          ok: false,
          error:
            'Flashcards can be generated only from `note` or `link` node types',
        };
      }

      return { ok: true, result: flashcards };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { GenerateFlashcardsUseCase };
