import type {
  Flashcard,
  FlashcardGenerator,
} from '../../application/ports/flashcard-generator.js';

class MockFlashcardGenerator implements FlashcardGenerator {
  public async generate(_: string): Promise<Array<Flashcard>> {
    return [
      {
        back: 'Agents struggle with non-ASCII strings in CLI tools, e.g., feeding newlines or control characters via shell arguments.',
        front: 'Why do non-ASCII string inputs cause issues with CLI tools?',
      },
      {
        back: 'Claude Code performs a security preflight using the Haiku model before executing shell tools, which can block or slow down dangerous tool invocations.',
        front: 'What is the security preflight step in Claude Code?',
      },
      {
        back: 'Stateful session management is hard with CLI tools because agents must remember session names, e.g., tmux sessions can be renamed or forgotten, causing failures.',
        front:
          'Why is managing sessions difficult when using tmux with agents?',
      },
    ];
  }
}

export { MockFlashcardGenerator };
