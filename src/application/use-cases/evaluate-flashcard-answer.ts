import type {
  FlashcardAnswerGrader,
  FlashcardAnswerEvaluation,
} from '../ports/flashcard-answer-grader.js';
import { Result } from '../../shared/result.js';

class EvaluateFlashcardAnswerUseCase {
  constructor(private readonly grader: FlashcardAnswerGrader) {}

  async execute(input: {
    front: string;
    back: string;
    answer: string;
  }): Promise<Result<FlashcardAnswerEvaluation, Error>> {
    try {
      const evaluation = await this.grader.evaluate(input);
      return Result.success(evaluation);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { EvaluateFlashcardAnswerUseCase };
