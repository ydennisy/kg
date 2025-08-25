import type {
  FlashcardAnswerGrader,
  FlashcardAnswerEvaluation,
} from '../../application/ports/flashcard-answer-grader.js';

class MockFlashcardAnswerGrader implements FlashcardAnswerGrader {
  async evaluate(input: {
    front: string;
    back: string;
    answer: string;
  }): Promise<FlashcardAnswerEvaluation> {
    const normalizedBack = input.back.trim().toLowerCase();
    const normalizedAnswer = input.answer.trim().toLowerCase();
    const score = normalizedBack === normalizedAnswer ? 1 : 0;
    const comment = score === 1 ? 'Exact match' : 'Incorrect';
    return { score, comment };
  }
}

export { MockFlashcardAnswerGrader };
