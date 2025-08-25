import ollama from 'ollama';
import type {
  FlashcardAnswerGrader,
  FlashcardAnswerEvaluation,
} from '../../application/ports/flashcard-answer-grader.js';

const tools = [
  {
    type: 'function',
    function: {
      name: 'grade_response',
      description: 'Grade the response provided by the user.',
      parameters: {
        type: 'object',
        properties: {
          grade: {
            type: 'number',
            description: '0 = wrong, 0.5 = close, 1 = correct',
          },
          reason: {
            type: 'string',
            description: 'Explanation for the given grade.',
          },
        },
        required: ['grade', 'reason'],
      },
    },
  },
];

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
          'You grade flashcard answers. ' +
          'You will be provided the flashcard QUESTION, ANSWER and the answer given by the USER. ' +
          'You must grade if the user has provided a correct answer for the card. ' +
          'Call the grade_response tool with your grade and reasoning for the given grade.',
      },
      {
        role: 'user',
        content: `QUESTION: ${input.front}\nANSWER: ${input.back}\nUSER: ${input.answer}`,
      },
    ];
    const response = await ollama.chat({
      model: 'gpt-oss:20b',
      messages,
      think: 'medium',
      tools: tools,
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
