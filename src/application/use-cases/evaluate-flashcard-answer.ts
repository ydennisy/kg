import type {
  FlashcardAnswerGrader,
  FlashcardAnswerEvaluation,
} from '../ports/flashcard-answer-grader.js';

class EvaluateFlashcardAnswerUseCase {
  constructor(private readonly grader: FlashcardAnswerGrader) {}

  async execute(input: {
    front: string;
    back: string;
    answer: string;
  }): Promise<
    { ok: true; result: FlashcardAnswerEvaluation } | { ok: false; error: string }
  > {
    try {
      const evaluation = await this.grader.evaluate(input);
      return { ok: true, result: evaluation };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { EvaluateFlashcardAnswerUseCase };
