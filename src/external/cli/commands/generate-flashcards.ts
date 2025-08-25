import { Command } from 'commander';
import { select, confirm, input } from '@inquirer/prompts';
import type { SearchNodesUseCase } from '../../../application/use-cases/search-nodes.js';
import type { GenerateFlashcardsUseCase } from '../../../application/use-cases/generate-flashcards.js';
import type { CreateNodeUseCase } from '../../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../../application/use-cases/link-nodes.js';
import { searchPrompt } from '../prompts/search.js';
import type { Flashcard } from '../../../application/ports/flashcard-generator.js';

class GenerateFlashcardsCommand {
  constructor(
    private readonly searchNodesUseCase: SearchNodesUseCase,
    private readonly generateFlashcardsUseCase: GenerateFlashcardsUseCase,
    private readonly createNodeUseCase: CreateNodeUseCase,
    private readonly linkNodesUseCase: LinkNodesUseCase
  ) {}

  register(program: Command): void {
    program
      .command('gf')
      .description('Generate flashcards given a node')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
    const nodeId = await searchPrompt(this.searchNodesUseCase);

    console.log('\n🎯 Generating flashcards...\n');

    const result = await this.generateFlashcardsUseCase.execute({
      id: nodeId,
    });

    if (!result.ok) {
      console.error(`❌ Error generating flashcards: ${result.error}`);
      process.exit(1);
    }

    const flashcards = result.result;

    if (flashcards.length === 0) {
      console.log('No flashcards were generated.');
      return;
    }

    console.log(
      `✨ Generated ${flashcards.length} flashcards. Let's review them!\n`
    );

    const selectedFlashcards = await this.reviewFlashcards(flashcards);

    if (selectedFlashcards.length === 0) {
      console.log('\n❌ No flashcards were selected for saving.');
      return;
    }

    const makePublic = await confirm({
      message: `Make all ${selectedFlashcards.length} kept cards public?`,
      default: false,
    });

    console.log(`\n💾 Saving ${selectedFlashcards.length} flashcards...`);

    const createdIds: string[] = [];
    for (const flashcard of selectedFlashcards) {
      const saveResult = await this.createNodeUseCase.execute({
        type: 'flashcard',
        data: {
          front: flashcard.front,
          back: flashcard.back,
        },
        isPublic: makePublic,
      });
      if (saveResult.ok) {
        createdIds.push(saveResult.result.id);
      } else {
        console.error(`  ❌ Failed to save a flashcard: ${saveResult.error}`);
      }
    }

    console.log(`✅ Successfully saved ${createdIds.length} flashcards!`);

    for (const id of createdIds) {
      const linkRes = await this.linkNodesUseCase.execute({
        fromId: nodeId,
        toId: id,
        type: 'related_to',
        isBidirectional: true,
      });
      if (!linkRes.ok) {
        console.error(`  ❌ Failed to link ${id}: ${linkRes.error}`);
      }
    }
    console.log(
      `🔗 Linked ${createdIds.length} flashcards to the source node.`
    );
  }

  private async reviewFlashcards(
    flashcards: Array<Flashcard>
  ): Promise<Array<{ front: string; back: string }>> {
    const selectedFlashcards: Array<{ front: string; back: string }> = [];
    let currentIndex = 0;

    while (currentIndex < flashcards.length) {
      const card = flashcards[currentIndex];

      if (!card) {
        break;
      }

      console.clear();
      console.log(`\n📚 Card ${currentIndex + 1} of ${flashcards.length}`);
      console.log('─'.repeat(50));
      console.log('\n🎯 FRONT:');
      console.log(`   ${card.front}`);
      console.log('\n💡 BACK:');
      console.log(`   ${card.back}`);
      console.log('');

      const action = await select({
        message: 'What would you like to do with this card?',
        choices: [
          { name: '✅ Keep this card', value: 'keep' },
          { name: '❌ Discard this card', value: 'discard' },
          { name: '⏮️ Previous card', value: 'previous' },
          { name: '⏭️ Skip to next', value: 'next' },
          { name: '📝 Edit and keep', value: 'edit' },
          { name: '🚪 Finish review', value: 'quit' },
        ],
      });

      switch (action) {
        case 'keep':
          if (
            !selectedFlashcards.some(
              (fc) => fc.front === card.front && fc.back === card.back
            )
          ) {
            selectedFlashcards.push(card);
            console.log('✅ Card added to selection');
          }
          currentIndex++;
          break;
        case 'discard':
          {
            const index = selectedFlashcards.findIndex(
              (fc) => fc.front === card.front && fc.back === card.back
            );
            if (index > -1) {
              selectedFlashcards.splice(index, 1);
            }
            console.log('❌ Card discarded');
            currentIndex++;
          }
          break;
        case 'previous':
          if (currentIndex > 0) {
            currentIndex--;
          } else {
            console.log('⚠️  Already at the first card');
          }
          break;
        case 'next':
          currentIndex++;
          break;
        case 'edit':
          {
            const editedFront = await input({
              message: 'Edit front:',
              default: card.front,
            });
            const editedBack = await input({
              message: 'Edit back:',
              default: card.back,
            });
            const editedCard = { front: editedFront, back: editedBack };
            const oldIndex = selectedFlashcards.findIndex(
              (fc) => fc.front === card.front && fc.back === card.back
            );
            if (oldIndex > -1) {
              selectedFlashcards.splice(oldIndex, 1);
            }
            selectedFlashcards.push(editedCard);
            console.log('✏️  Card edited and kept');
            currentIndex++;
          }
          break;
        case 'quit':
          return selectedFlashcards;
      }
    }

    const finalAction = await select({
      message: 'Review complete. What next?',
      choices: [
        { name: '💾 Save selected cards', value: 'save' },
        { name: '🔄 Review again', value: 'review' },
        { name: '❌ Discard all and exit', value: 'discard' },
      ],
    });

    switch (finalAction) {
      case 'save':
        return selectedFlashcards;
      case 'review':
        return this.reviewFlashcards(flashcards);
      case 'discard':
        return [];
    }

    return selectedFlashcards;
  }
}

export { GenerateFlashcardsCommand };
