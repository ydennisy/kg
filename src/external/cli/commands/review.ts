import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import type { GetDueFlashcardsUseCase } from '../../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardAnswerUseCase } from '../../../application/use-cases/review-flashcard-answer.js';

class ReviewCommand {
  constructor(
    private readonly getDueFlashcardsUseCase: GetDueFlashcardsUseCase,
    private readonly reviewFlashcardAnswerUseCase: ReviewFlashcardAnswerUseCase
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
      console.error(`❌ Error fetching flashcards: ${result.error.message}`);
      return;
    }
    const cards = result.value;
    if (cards.length === 0) {
      console.log('No flashcards are due for review.');
      return;
    }

    for (const [i, card] of cards.entries()) {
      console.log(`\n📚 Card ${i + 1} of ${cards.length}`);
      console.log(`Front: ${card.data.front}`);
      console.log();
      const answer = await input({
        message: 'Type your answer:',
      });
      const review = await this.reviewFlashcardAnswerUseCase.execute({
        id: card.id,
        answer,
      });
      if (review.ok) {
        const score = review.value.evaluation.score;
        const label =
          score === 1
            ? '✅ Correct'
            : score === 0.5
            ? '⚠️ Partially correct'
            : '❌ Incorrect';
        console.log(`${label}: ${review.value.evaluation.comment}`);
      } else {
        console.error(`  ❌ Failed to review card: ${review.error.message}`);
      }
      console.log();
      console.log('─'.repeat(50));
      console.log(`Back: ${card.data.back}`);
      console.log();
    }

    console.log('\n✅ Review session complete');
  }
}

export { ReviewCommand };
