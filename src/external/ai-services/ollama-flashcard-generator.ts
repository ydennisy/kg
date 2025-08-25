import ollama from 'ollama';
import type {
  Flashcard,
  FlashcardGenerator,
} from '../../application/ports/flashcard-generator.js';

const tools = [
  {
    type: 'function',
    function: {
      name: 'create_flashcard',
      description: 'Creates and saves a single flashcard',
      parameters: {
        type: 'object',
        properties: {
          front: {
            type: 'string',
            description: 'The front of the flashcard (the question)',
          },
          back: {
            type: 'string',
            description: 'The back of the flashcard (the answer)',
          },
        },
        required: ['front', 'back'],
      },
    },
  },
];

class OllamaFlashcardGenerator implements FlashcardGenerator {
  public async generate(text: string): Promise<Array<Flashcard>> {
    const messages = [
      {
        role: 'system',
        content:
          'You are an AI teacher. Read the document and create high-quality flashcards. ' +
          'Only use the `create_flashcard` tool to output cards. Keep going, one card per tool call, ' +
          'until there are no more good cards. When finished, reply with the single word DONE.',
      },
      { role: 'user', content: `Create flashcards for:\n---\n${text}` },
    ];

    const flashcards: Array<Flashcard> = [];

    while (true) {
      const response = await ollama.chat({
        model: 'gpt-oss:20b',
        messages: messages,
        think: 'low',
        tools: tools,
      });

      // Check if the model is done
      const isDoneMessage =
        response?.message?.content?.trim().toUpperCase() === 'DONE';

      const areToolCallsExhausted =
        !response.message?.tool_calls ||
        response.message.tool_calls.length === 0;

      if (areToolCallsExhausted && isDoneMessage) {
        break;
      }

      // Execute tool calls
      if (response.message?.tool_calls?.length) {
        messages.push(response.message);
        for (const call of response.message.tool_calls) {
          if (call.function?.name === 'create_flashcard') {
            const card = call.function.arguments as Flashcard;
            flashcards.push(card);

            // Provide a tool "result" message so the model knows it succeeded
            messages.push({
              role: 'tool',
              // Ollama accepts role: 'tool'; does it accept an ID?
              content: JSON.stringify({
                status: 'ok',
                index: flashcards.length,
              }),
            });
          }
        }

        // Nudge it to continue
        messages.push({
          role: 'system',
          content:
            'Continue creating more unique, high-value flashcards. When no more remain, respond with DONE.',
        });
      } else {
        // No tool calls and not "DONE" — give a gentle reminder
        messages.push({
          role: 'system',
          content:
            'Remember: output flashcards ONLY by calling the create_flashcard tool. Continue.',
        });
      }
    }

    return flashcards;
  }
}

export { OllamaFlashcardGenerator };
