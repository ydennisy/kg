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
          'You are an expert in creating high-quality, atomic flashcards for spaced repetition systems. ' +
          'Your task is to analyze the provided text and generate flashcards based on its content. ' +
          'Follow these rules strictly:\n' +
          '1.  **Atomicity**: Each flashcard must test only ONE concept, fact, or definition. (Minimum Information Principle).\n' +
          '2.  **Self-Contained**: The question on the front must be fully understandable without the original text. Do NOT use phrases like "According to the article..." or pronouns that refer back to the source document.\n' +
          '3.  **Clarity**: Formulate clear, unambiguous questions. The answer on the back should be concise and directly address the question.\n' +
          '4.  **Direction**: For concepts, prefer "What is X?" or "Define X." For processes, prefer "What is the first step in Y?"\n\n' +
          'Use the `create_flashcard` tool to output each card. Generate as many high-value cards as possible. ' +
          'When you have extracted all possible flashcards, respond with the single word DONE.',
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
      const toolCalls = response.message?.tool_calls;
      const isDoneMessage =
        response?.message?.content?.trim().toUpperCase() === 'DONE';

      if (!toolCalls && isDoneMessage) {
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
