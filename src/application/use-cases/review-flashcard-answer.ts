import { FlashcardNode } from '../../domain/flashcard-node.js';
import type {
  FlashcardAnswerEvaluation,
  FlashcardAnswerGrader,
} from '../ports/flashcard-answer-grader.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

class ReviewFlashcardAnswerUseCase {
  constructor(
    private readonly repository: NodeRepository,
    private readonly grader: FlashcardAnswerGrader
  ) {}

  async execute(input: {
    id: string;
    answer: string;
  }): Promise<
    Result<{ flashcard: FlashcardNode; evaluation: FlashcardAnswerEvaluation }, Error>
  > {
    try {
      const { id, answer } = input;

      const node = await this.repository.findById(id);
      if (!node || node.type !== 'flashcard') {
        return Result.failure(new Error('Flashcard not found'));
      }

      const evaluation = await this.grader.evaluate({
        front: node.data.front,
        back: node.data.back,
        answer,
      });

      const quality =
        evaluation.score === 1 ? 5 : evaluation.score === 0.5 ? 3 : 0;

      const reviewed = node.review(quality);
      await this.repository.update(reviewed);

      return Result.success({ flashcard: reviewed, evaluation });
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { ReviewFlashcardAnswerUseCase };
