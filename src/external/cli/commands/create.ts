import { Command } from 'commander';
import { select, input, confirm, editor } from '@inquirer/prompts';
import type { NodeType } from '../../../domain/types.js';
import type { CreateNodeUseCase } from '../../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../../application/use-cases/link-nodes.js';
import type { SearchNodesUseCase } from '../../../application/use-cases/search-nodes.js';
import { searchPrompt } from '../prompts/search.js';

// TODO: we should not need to duplicate this type
// Keep same NodeInputData type from original file

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

class CreateCommand {
  constructor(
    private readonly createNodeUseCase: CreateNodeUseCase,
    private readonly linkNodesUseCase: LinkNodesUseCase,
    private readonly searchNodesUseCase: SearchNodesUseCase
  ) {}

  register(program: Command): void {
    program
      .command('create')
      .description('Create a new node')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
    try {
      const nodeType = await select({
        message: 'What type of node do you want to create?',
        choices: [
          { name: 'Note', value: 'note' as NodeType },
          { name: 'Link', value: 'link' as NodeType },
          { name: 'Tag', value: 'tag' as NodeType },
          { name: 'Flashcard', value: 'flashcard' as NodeType },
        ],
      });

      const inputData = await this.collectNodeInput(nodeType);

      const isPublic = await confirm({
        message: 'Make this node public? (y/N)',
        default: false,
      });

      const result = await this.createNodeUseCase.execute({
        ...inputData,
        isPublic,
      });

      if (result && result.ok) {
        const { node, warning } = result.value;
        console.log('✅ Created node:');
        console.log(`  Type: ${node.type}`);
        console.log(`  Title: ${node.title}`);
        console.log(`  ID: ${node.id}`);
        if (warning) {
          console.warn(`⚠️  ${warning}`);
        }

        console.log();

        const shouldLink = await confirm({
          message: 'Would you like to link this node to existing nodes? (y/N)',
          default: false,
        });

        if (shouldLink) {
          await this.linkNode(node.id);
        }
      } else {
        console.error(`❌ Error creating node: ${result.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
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

  private async linkNode(newNodeId: string): Promise<void> {
    try {
      const selectedNodes: string[] = [];

      while (true) {
        const nodeId = await searchPrompt(this.searchNodesUseCase, {
          filterResults: (results) =>
            results.filter(
              ({ node }) =>
                node.id !== newNodeId && !selectedNodes.includes(node.id)
            ),
          formatResult: ({ node, score, snippet }) => {
            const snippetPreview =
              snippet
                .replace(/<b>/g, '')
                .replace(/<\/b>/g, '')
                .substring(0, 50) + (snippet.length > 50 ? '...' : '');
            return {
              name: `[${node.type.toUpperCase()}] ${node.title} - ${snippetPreview} (Score: ${score.toFixed(
                2
              )})`,
              value: node.id,
            };
          },
        });

        selectedNodes.push(nodeId);
        console.log(`✅ Added node ${nodeId} to link list`);

        const addMore = await confirm({
          message: 'Add another link? (Y/n)',
          default: true,
        });
        if (!addMore) {
          break;
        }
      }

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
              `❌ Error linking to node ${targetNodeId}: ${linkResult.error.message}`
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
}

export { CreateCommand };
