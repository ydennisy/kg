import { Command } from 'commander';
import { select, input, confirm, editor } from '@inquirer/prompts';
import autocomplete from 'inquirer-autocomplete-standalone';
import packageJSON from '../../../package.json' with { type: 'json' };
import type { NodeType } from '../../domain/types.js';
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../application/use-cases/link-nodes.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { SearchNodesUseCase } from '../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../application/use-cases/get-node.js';
import type { GenerateFlashcardsUseCase } from '../../application/use-cases/generate-flashcards.js';
import type { GetDueFlashcardsUseCase } from '../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardUseCase } from '../../application/use-cases/review-flashcard.js';
import type { Flashcard } from '../../application/ports/flashcard-generator.js';

// TODO: we should not need to duplicate this type
type NodeInputData =
  | {
      type: 'flashcard';
      data: { front: string; back: string };
    }
  | {
      type: 'link';
      title: string | undefined;
      data: { url: string };
    }
  | {
      type: 'note';
      title: string;
      data: { content: string };
    }
  | {
      type: 'tag';
      data: { name: string; description?: string };
    };

export class CLI {
  private program: Command;

  constructor(
    private createNodeUseCase: CreateNodeUseCase,
    private linkNodesUseCase: LinkNodesUseCase,
    private searchNodesUseCase: SearchNodesUseCase,
    private getNodeUseCase: GetNodeUseCase,
    private generateFlashcardsUseCase: GenerateFlashcardsUseCase,
    private publishSiteUseCase: PublishSiteUseCase,
    private getDueFlashcardsUseCase: GetDueFlashcardsUseCase,
    private reviewFlashcardUseCase: ReviewFlashcardUseCase
  ) {
    this.program = new Command();
    this.setupCommands();
  }

  public run(argv?: string[]): void {
    this.program.parse(argv);
  }

  private setupCommands(): void {
    this.program
      .name('kg')
      .description('Knowledge Graph CLI')
      .version(packageJSON.version);

    this.program
      .command('create')
      .description('Create a new node')
      .action(async () => {
        await this.createNode();
      });

    this.program
      .command('search')
      .description('Search nodes')
      .action(async () => {
        await this.searchNodes();
      });

    this.program
      .command('gf')
      .description('Generate flashcards given a node')
      .action(async () => {
        await this.generateFlashcards();
      });

    this.program
      .command('publish')
      .description('Publish public nodes to static site (./public)')
      .action(async () => {
        await this.publishSite();
      });

    this.program
      .command('review')
      .description('Review due flashcards')
      .action(async () => {
        await this.reviewDueFlashcards();
      });
  }

  private async createNode(): Promise<void> {
    try {
      // Step 1: Select node type
      const nodeType = await select({
        message: 'What type of node do you want to create?',
        choices: [
          { name: 'Note', value: 'note' as NodeType },
          { name: 'Link', value: 'link' as NodeType },
          { name: 'Tag', value: 'tag' as NodeType },
          { name: 'Flashcard', value: 'flashcard' as NodeType },
        ],
      });
     
      // Step 2: Collect data based on node type
      const input = await this.collectNodeInput(nodeType);

      // Step 3: Ask if node should be public
      const isPublic = await confirm({
        message: 'Make this node public (default: No)?',
        default: false,
      });

      // Step 4: Create the node
      const result = await this.createNodeUseCase.execute({
        ...input,
        isPublic,
      });

      if (result && result.ok) {
        console.log(`✅ Created ${nodeType} node with ID: ${result.result.id}`);

        // Step 5: Ask if user wants to link to existing nodes
        const shouldLink = await confirm({
          message: 'Would you like to link this node to existing nodes?',
          default: false,
        });

        if (shouldLink) {
          await this.linkNode(result.result.id);
        }
      } else {
        console.error(`❌ Error creating node: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
  }

  private async searchNodes() {
    const nodeId = await autocomplete({
      message: 'Query:',
      emptyText: 'Enter a query to search...',
      pageSize: 20,
      source: async (query) => {
        if (!query) {
          return [];
        }
        const result = await this.searchNodesUseCase.execute({
          query,
          withRelations: true,
        });
        if (!result.ok) {
          console.error(`❌ Error searching nodes: ${result.error}`);
          process.exit(1);
        }
        return result.result.map(({ node, score, snippet }) => {
          const highlightedSnippet = snippet
            .replace(/<b>/g, '\x1b[1m')
            .replace(/<\/b>/g, '\x1b[0m');
          const relatedPreview = node.relatedNodes
            .slice(0, 3)
            .map(
              ({ node: r, relationship }) =>
                `→ ${r.title} (${relationship.type})`
            )
            .join(', ');
          const description = relatedPreview
            ? `${highlightedSnippet}\n${relatedPreview}`
            : `${highlightedSnippet}`;
          return {
            value: node.id,
            name: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(
              2
            )})`,
            description,
          };
        });
      },
    });

    const result = await this.getNodeUseCase.execute({ id: nodeId });

    if (!result.ok) {
      console.error(`❌ Error fetching node: ${result.error}`);
      process.exit(1);
    }

    await editor({
      message: 'Read only node was displayed in the editor',
      default: JSON.stringify(result.result, undefined, 2),
      waitForUseInput: false,
    });
  }

  private async generateFlashcards() {
    // TODO: extract logic, used in a few places
    const nodeId = await autocomplete({
      message: 'Query:',
      emptyText: 'Enter a query to search...',
      pageSize: 20,
      source: async (query) => {
        if (!query) {
          return [];
        }
        const result = await this.searchNodesUseCase.execute({ query });
        if (!result.ok) {
          console.error(`❌ Error searching nodes: ${result.error}`);
          process.exit(1);
        }
        return result.result.map(({ node, score, snippet }) => {
          const highlightedSnippet = snippet
            .replace(/<b>/g, '\x1b[1m')
            .replace(/<\/b>/g, '\x1b[0m');
          return {
            value: node.id,
            name: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(
              2
            )})`,
            description: `${highlightedSnippet}`,
          };
        });
      },
    });

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

    // Save selected flashcards
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
        type: 'related_to', // TODO: ask the user
        isBidirectional: true, // TODO: ask the user
      });
      if (!linkRes.ok) {
        console.error(`  ❌ Failed to link ${id}: ${linkRes.error}`);
      }
    }
    console.log(
      `🔗 Linked ${createdIds.length} flashcards to the source node.`
    );
  }

  private async reviewFlashcards(flashcards: Array<Flashcard>) {
    const selectedFlashcards: Array<{ front: string; back: string }> = [];
    let currentIndex = 0;

    while (currentIndex < flashcards.length) {
      const card = flashcards[currentIndex];

      if (!card) {
        // TODO: error
        break;
      }
      // Clear the console for a cleaner view (optional)
      console.clear();

      // Display progress
      console.log(`\n📚 Card ${currentIndex + 1} of ${flashcards.length}`);
      console.log('─'.repeat(50));

      // Show the card
      console.log('\n🎯 FRONT:');
      console.log(`   ${card.front}`);
      console.log('\n💡 BACK:');
      console.log(`   ${card.back}`);

      // Ask what to do with this card
      const action = await select({
        message: '\nWhat would you like to do with this card?',
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
          // Remove from selected if it was previously added
          const index = selectedFlashcards.findIndex(
            (fc) => fc.front === card.front && fc.back === card.back
          );
          if (index > -1) {
            selectedFlashcards.splice(index, 1);
          }
          console.log('❌ Card discarded');
          currentIndex++;
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
          const editedFront = await input({
            message: 'Edit front:',
            default: card.front,
          });

          const editedBack = await input({
            message: 'Edit back:',
            default: card.back,
          });

          const editedCard = { front: editedFront, back: editedBack };

          // Remove old version if exists and add edited version
          const oldIndex = selectedFlashcards.findIndex(
            (fc) => fc.front === card.front && fc.back === card.back
          );
          if (oldIndex > -1) {
            selectedFlashcards.splice(oldIndex, 1);
          }
          selectedFlashcards.push(editedCard);
          console.log('✅ Edited card added to selection');
          currentIndex++;
          break;

        case 'quit':
          const confirmQuit = await confirm({
            message: `You've selected ${selectedFlashcards.length} cards. Finish review and save?`,
            default: true,
          });
          if (confirmQuit) {
            return selectedFlashcards;
          }
          break;
      }
    }

    if (currentIndex >= flashcards.length) {
      console.clear();
      console.log("\n🎉 You've reviewed all flashcards!");
      console.log(
        `📊 Selected: ${selectedFlashcards.length} out of ${flashcards.length} cards`
      );

      const finalAction = await select({
        message: 'What would you like to do?',
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
          currentIndex = 0;
          break;
        case 'discard':
          return [];
      }
    }

    return selectedFlashcards;
  }


  private async collectNodeInput(nodeType: NodeType): Promise<NodeInputData> {
    switch (nodeType) {
      case 'note': {
        const title = await input({
          message: 'Enter note title:',
          validate: (value: string) =>
            value.trim().length > 0 || 'Title is required for notes',
        });
        const data = {
          content: await editor({
            message: 'Enter note content (will open in editor):',
            waitForUseInput: false,
          }),
        };
        return { type: 'note', title, data };
      }

      case 'link': {
        const data = {
          url: await input({
            message: 'Enter URL:',
            validate: (value: string) =>
              value.trim().length > 0 || 'URL is required',
          }),
        };
        const title = await input({
          message: 'Enter a title, or leave blank to use URL title:',
          default: '',
        });
        return {
          type: 'link',
          title: title.trim() === '' ? undefined : title,
          data,
        };
      }

      case 'tag': {
        const data = {
          name: await input({
            message: 'Enter tag name:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Name is required',
          }),
          description: await editor({
            message: 'Enter tag description (optional, opens editor):',
            default: '',
            waitForUseInput: false,
          }),
        };

        return { type: 'tag', data };
      }

      case 'flashcard': {
        const data = {
          front: await input({
            message: 'Enter flashcard front text:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Front text is required',
          }),
          back: await input({
            message: 'Enter flashcard back text:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Back text is required',
          }),
        };
        return { type: 'flashcard', data };
      }

      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }

  private async publishSite(): Promise<void> {
    try {
      console.log('🔄 Generating static site...');

      const result = await this.publishSiteUseCase.execute();

      if (result.ok) {
        console.log(
          `✅ Successfully published ${result.result.filesGenerated} files to ${result.result.outputDir}`
        );
      } else {
        console.error(`❌ Error publishing site: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
  }

  private async linkNode(newNodeId: string): Promise<void> {
    try {
      const selectedNodes: string[] = [];

      while (true) {
        const nodeId = await autocomplete({
          message:
            selectedNodes.length === 0
              ? 'Search for a node to link:'
              : 'Search for another node to link (or press Enter to finish):',
          source: async (input?: string) => {
            if (!input || input.trim().length === 0) {
              return selectedNodes.length > 0
                ? [{ name: '✅ Finish linking', value: 'FINISH' }]
                : [];
            }

            const searchResult = await this.searchNodesUseCase.execute({
              query: input,
            });

            if (!searchResult.ok) {
              return [
                {
                  name: `Error: ${searchResult.error}`,
                  value: null,
                  disabled: true,
                },
              ];
            }

            const results = searchResult.result;

            // Filter out the newly created node and already selected nodes
            const filteredResults = results.filter(
              ({ node }) =>
                node.id !== newNodeId && !selectedNodes.includes(node.id)
            );

            if (filteredResults.length === 0) {
              return [
                {
                  name: 'No matching nodes found',
                  value: null,
                  disabled: true,
                },
              ];
            }

            return filteredResults.map(({ node, score, snippet }) => {
              // Use snippet for preview instead of fetching full node data
              const snippetPreview =
                snippet
                  .replace(/<b>/g, '')
                  .replace(/<\/b>/g, '')
                  .substring(0, 50) + (snippet.length > 50 ? '...' : '');

              return {
                name: `[${node.type.toUpperCase()}] ${node.title} - ${snippetPreview} (Score: ${score.toFixed(2)})`,
                value: node.id,
              };
            });
          },
        });

        if (nodeId === 'FINISH' || nodeId === null || nodeId === undefined) {
          break;
        }

        selectedNodes.push(nodeId);
        console.log(`✅ Added node ${nodeId} to link list`);
      }

      // Create links for all selected nodes
      if (selectedNodes.length > 0) {
        for (const targetNodeId of selectedNodes) {
          const linkResult = await this.linkNodesUseCase.execute({
            fromId: newNodeId,
            toId: targetNodeId,
            type: 'related_to',
            isBidirectional: true,
          });

          if (!linkResult.ok) {
            console.error(
              `❌ Error linking to node ${targetNodeId}: ${linkResult.error}`
            );
          }
        }
        console.log(`✅ Created ${selectedNodes.length} links to the new node`);
      } else {
        console.log('No nodes were linked.');
      }
    } catch (error) {
      console.error('❌ Error linking nodes:', error);
    }
  }

  private async reviewDueFlashcards(): Promise<void> {
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
