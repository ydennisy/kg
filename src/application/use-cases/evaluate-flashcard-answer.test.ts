import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EvaluateFlashcardAnswerUseCase } from './evaluate-flashcard-answer.js';
import type {
  FlashcardAnswerEvaluation,
  FlashcardAnswerGrader,
} from '../ports/flashcard-answer-grader.js';
import { assertOk } from '../../../test/assert.js';

describe('EvaluateFlashcardAnswerUseCase', () => {
  let grader: FlashcardAnswerGrader;
  let useCase: EvaluateFlashcardAnswerUseCase;

  beforeEach(() => {
    grader = {
      evaluate: vi.fn(),
    } as unknown as FlashcardAnswerGrader;
    useCase = new EvaluateFlashcardAnswerUseCase(grader);
    vi.clearAllMocks();
  });

  test('returns evaluation from grader', async () => {
    const evaluation: FlashcardAnswerEvaluation = {
      score: 1,
      comment: 'great',
    };
    const input = { front: 'front', back: 'back', answer: 'ans' };
    vi.mocked(grader.evaluate).mockResolvedValue(evaluation);

    const result = await useCase.execute(input);

    assertOk(result);
    expect(result.result).toBe(evaluation);
    expect(grader.evaluate).toHaveBeenCalledWith(input);
  });

  test('returns error when grader throws', async () => {
    vi.mocked(grader.evaluate).mockRejectedValue(new Error('fail'));

    const result = await useCase.execute({
      front: 'front',
      back: 'back',
      answer: 'wrong',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('fail');
    }
  });
});
