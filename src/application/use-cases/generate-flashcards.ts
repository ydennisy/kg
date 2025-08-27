import type {
  FlashcardGenerator,
  Flashcard,
} from '../ports/flashcard-generator.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

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
  ): Promise<Result<Array<Flashcard>, Error>> {
    try {
      const node = await this.repository.findById(input.id, false);
      if (!node) {
        return Result.failure(new Error('Node not found'));
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
        return Result.failure(
          new Error(
            'Flashcards can be generated only from `note` or `link` node types'
          )
        );
      }

      return Result.success(flashcards);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { GenerateFlashcardsUseCase };
