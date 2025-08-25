type FlashcardAnswerEvaluation = {
  score: 0 | 0.5 | 1;
  comment: string;
};

interface FlashcardAnswerGrader {
  evaluate(input: {
    front: string;
    back: string;
    answer: string;
  }): Promise<FlashcardAnswerEvaluation>;
}

export type { FlashcardAnswerGrader, FlashcardAnswerEvaluation };
