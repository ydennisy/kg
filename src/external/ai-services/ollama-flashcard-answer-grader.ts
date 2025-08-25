import ollama from 'ollama';
import type {
  FlashcardAnswerGrader,
  FlashcardAnswerEvaluation,
} from '../../application/ports/flashcard-answer-grader.js';

class OllamaFlashcardAnswerGrader implements FlashcardAnswerGrader {
  async evaluate(input: {
    front: string;
    back: string;
    answer: string;
  }): Promise<FlashcardAnswerEvaluation> {
    const messages = [
      {
        role: 'system',
        content:
          'You grade flashcard answers. Respond in JSON with keys `score` (0, 0.5, or 1) and `comment`. ',
      },
      {
        role: 'user',
        content:
          `Front: ${input.front}\nCorrect Answer: ${input.back}\nUser Answer: ${input.answer}`,
      },
    ];
    const response = await ollama.chat({
      model: 'gpt-oss:20b',
      messages,
      format: 'json',
    });
    const content = response.message?.content ?? '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { score: 0, comment: 'Failed to parse model response' };
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'score' in parsed &&
      'comment' in parsed
    ) {
      const obj = parsed as { score: unknown; comment: unknown };
      if (
        (obj.score === 0 || obj.score === 0.5 || obj.score === 1) &&
        typeof obj.comment === 'string'
      ) {
        return {
          score: obj.score,
          comment: obj.comment,
        };
      }
    }
    return { score: 0, comment: 'Invalid model response' };
  }
}

export { OllamaFlashcardAnswerGrader };
