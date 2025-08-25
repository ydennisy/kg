import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import type { GetDueFlashcardsUseCase } from '../../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardUseCase } from '../../../application/use-cases/review-flashcard.js';

class ReviewCommand {
  constructor(
    private readonly getDueFlashcardsUseCase: GetDueFlashcardsUseCase,
    private readonly reviewFlashcardUseCase: ReviewFlashcardUseCase
  ) {}

  register(program: Command): void {
    program
      .command('review')
      .description('Review due flashcards')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
    console.log('\n🔁 Reviewing due flashcards...\n');
    const result = await this.getDueFlashcardsUseCase.execute({ limit: 20 });
    if (!result.ok) {
      console.error(`❌ Error fetching flashcards: ${result.error}`);
      return;
    }
    const cards = result.result;
    if (cards.length === 0) {
      console.log('No flashcards are due for review.');
      return;
    }

    for (const [i, card] of cards.entries()) {
      console.log(`\n📚 Card ${i + 1} of ${cards.length}`);
      console.log(`Front: ${card.data.front}`);
      await input({ message: 'Press enter to reveal the back' });
      console.log(`Back: ${card.data.back}`);
      const quality = await select({
        message: 'How well did you recall this card?',
        choices: [
          { name: 'Again', value: 0 },
          { name: 'Hard', value: 3 },
          { name: 'Good', value: 4 },
          { name: 'Easy', value: 5 },
        ],
      });
      const review = await this.reviewFlashcardUseCase.execute({
        flashcard: card,
        quality,
      });
      if (!review.ok) {
        console.error(`  ❌ Failed to review card: ${review.error}`);
      }
    }

    console.log('\n✅ Review session complete');
  }
}

export { ReviewCommand };
