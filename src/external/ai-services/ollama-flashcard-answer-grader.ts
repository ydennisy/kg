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
          'When providing your reasoning, address the user directly (use "you" instead of "the user"). ' +
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

    // Check for tool calls in the response
    if (
      !response.message?.tool_calls ||
      response.message.tool_calls.length === 0
    ) {
      console.warn('No tool calls received from model. Response:', {
        content: response.message?.content,
        role: response.message?.role,
      });
      return {
        score: 0,
        comment:
          'Model did not call the grade_response tool. Response: ' +
          (response.message?.content || 'No content'),
      };
    }

    // Process the tool calls
    for (const call of response.message.tool_calls) {
      if (call.function?.name === 'grade_response') {
        const args = call.function.arguments;

        // Validate the arguments structure
        if (!args || typeof args !== 'object') {
          console.error('Invalid tool call arguments:', { args, call });
          return {
            score: 0,
            comment: 'Tool call arguments are missing or invalid',
          };
        }

        // Extract and validate grade and reason
        const typedArgs = args as Record<string, unknown>;
        const { grade, reason } = typedArgs;

        // Validate grade field
        if (grade !== 0 && grade !== 0.5 && grade !== 1) {
          console.error('Invalid grade value:', {
            grade,
            expectedValues: [0, 0.5, 1],
            fullArgs: args,
          });
          return {
            score: 0,
            comment: `Invalid grade value: ${grade}. Expected 0, 0.5, or 1`,
          };
        }

        // Validate reason field
        if (typeof reason !== 'string' || reason.trim() === '') {
          console.error('Invalid reason value:', {
            reason,
            type: typeof reason,
            fullArgs: args,
          });
          return {
            score: 0,
            comment: `Invalid reason: ${typeof reason === 'string' ? 'empty string' : 'not a string'}`,
          };
        }

        // Successfully validated - return the result
        return {
          score: grade as 0 | 0.5 | 1,
          comment: reason.trim(),
        };
      }
    }

    // No grade_response tool call found
    const toolNames = response.message.tool_calls
      .map((call) => call.function?.name)
      .filter(Boolean);
    console.warn('Expected grade_response tool call but received:', {
      toolNames,
      toolCalls: response.message.tool_calls,
    });
    return {
      score: 0,
      comment: `Model called wrong tool(s): ${toolNames.join(', ')}. Expected: grade_response`,
    };
  }
}

export { OllamaFlashcardAnswerGrader };
