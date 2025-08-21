import { Command } from 'commander';
import { select, input, confirm, editor } from '@inquirer/prompts';
import autocomplete from 'inquirer-autocomplete-standalone';
import packageJSON from '../../../package.json' with { type: 'json' };
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../application/use-cases/link-nodes.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { SearchNodesUseCase } from '../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../application/use-cases/get-node.js';
import type { NodeType } from '../../domain/node.js';

export class CLI {
  private program: Command;

  constructor(
    private createNodeUseCase: CreateNodeUseCase,
    private linkNodesUseCase: LinkNodesUseCase,
    private searchNodesUseCase: SearchNodesUseCase,
    private getNodeUseCase: GetNodeUseCase,
    private publishSiteUseCase: PublishSiteUseCase
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
      .command('publish')
      .description('Publish public nodes to static site (./public)')
      .action(async () => {
        await this.publishSite();
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
      const { title, data } = await this.collectNodeInput(nodeType);

      // Step 3: Ask if node should be public
      const isPublic = await confirm({
        message: 'Make this node public?',
        default: false,
      });

      // Step 4: Create the node
      const result = await this.createNodeUseCase.execute({
        type: nodeType,
        title,
        data,
        isPublic,
      });

      if (result.ok) {
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
            name: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(2)})`,
            description: `${highlightedSnippet}`,
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

  private async collectNodeInput(
    nodeType: NodeType
  ): Promise<{ title: string | undefined; data: Record<string, unknown> }> {
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
        return { title, data };
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
          message: 'Enter URL title, or leave blank to use crawled title:',
          default: '',
        });
        return { title, data };
      }

      case 'tag': {
        const data = {
          name: await input({
            message: 'Enter tag name:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Name is required',
          }),
        };
        return { title: undefined, data };
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
        return { title: undefined, data };
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

            return filteredResults.map(({ node, score }) => {
              // Get a preview of the data
              const dataPreview = this.formatNodePreview(node);

              return {
                name: `[${node.type.toUpperCase()}] ${
                  node.title
                } - ${dataPreview} (Score: ${score.toFixed(2)})`,
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
            sourceId: newNodeId,
            targetId: targetNodeId,
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

  private formatNodePreview(node: any): string {
    const data = node.data;

    if (typeof data === 'string') {
      return data.slice(0, 50) + (data.length > 50 ? '...' : '');
    }

    if (typeof data === 'object' && data !== null) {
      // Try common preview fields
      const previewField = data.content || data.url || data.name || data.front;
      if (previewField && typeof previewField === 'string') {
        return (
          previewField.slice(0, 50) + (previewField.length > 50 ? '...' : '')
        );
      }

      // Fallback to JSON representation
      const jsonStr = JSON.stringify(data);
      return jsonStr.slice(0, 50) + (jsonStr.length > 50 ? '...' : '');
    }

    return 'No preview available';
  }
}
