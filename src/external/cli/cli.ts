import { Command } from 'commander';
import { select, input, confirm } from '@inquirer/prompts';
import autocomplete from 'inquirer-autocomplete-standalone';
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { NodeRepository } from '../../application/ports/node-repository.js';
import type { EdgeRepository } from '../../application/ports/edge-repository.js';
import type { EdgeFactory } from '../../domain/edge-factory.js';
import type { NodeType } from '../../domain/node.js';

export class CLI {
  private program: Command;

  constructor(
    private createNodeUseCase: CreateNodeUseCase,
    private publishSiteUseCase: PublishSiteUseCase,
    private nodeRepository: NodeRepository,
    private edgeRepository: EdgeRepository,
    private edgeFactory: EdgeFactory
  ) {
    this.program = new Command();
    this.setupCommands();
  }

  public run(argv?: string[]): void {
    this.program.parse(argv);
  }

  private setupCommands(): void {
    this.program.name('kg').description('Knowledge Graph CLI').version('0.0.1');

    this.program
      .command('create')
      .description('Create a new node')
      .action(async () => {
        await this.createNode();
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

      // Step 2: Collect title
      const title = await this.collectTitle(nodeType);

      // Step 3: Collect data based on node type
      const data = await this.collectNodeData(nodeType);

      // Step 4: Ask if node should be public
      const isPublic = await confirm({
        message: 'Make this node public?',
        default: false,
      });

      // Step 5: Create the node
      const result = await this.createNodeUseCase.execute({
        type: nodeType,
        title,
        data,
        isPublic,
      });

      if (result.ok) {
        console.log(`✅ Created ${nodeType} node with ID: ${result.node.id}`);

        // Step 6: Ask if user wants to link to existing nodes
        const shouldLink = await confirm({
          message: 'Would you like to link this node to existing nodes?',
          default: false,
        });

        if (shouldLink) {
          await this.linkNodesToNewNode(result.node.id);
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

  private async collectTitle(nodeType: NodeType): Promise<string> {
    if (nodeType === 'note') {
      return await input({
        message: 'Enter note title:',
        validate: (value: string) =>
          value.trim().length > 0 || 'Title is required for notes',
      });
    } else {
      return await input({
        message: `Enter ${nodeType} title (optional):`,
        default: '',
      });
    }
  }

  private async collectNodeData(
    nodeType: NodeType
  ): Promise<Record<string, unknown>> {
    switch (nodeType) {
      case 'note':
        return {
          content: await input({
            message: 'Enter note content:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Content is required',
          }),
        };

      case 'link':
        return {
          url: await input({
            message: 'Enter URL:',
            validate: (value: string) =>
              value.trim().length > 0 || 'URL is required',
          }),
        };

      case 'tag':
        return {
          name: await input({
            message: 'Enter tag name:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Name is required',
          }),
        };

      case 'flashcard':
        return {
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
          `✅ Successfully published ${result.filesGenerated} files to ${result.outputDir}`
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

  private async linkNodesToNewNode(newNodeId: string): Promise<void> {
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

            const results = await this.nodeRepository.search(input);

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
              const dataPreview = this.getNodeDataPreview(node);

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

      // Create edges for all selected nodes
      if (selectedNodes.length > 0) {
        for (const targetNodeId of selectedNodes) {
          const edge = this.edgeFactory.createEdge(newNodeId, targetNodeId);
          await this.edgeRepository.save(edge);
        }
        console.log(`✅ Created ${selectedNodes.length} links to the new node`);
      } else {
        console.log('No nodes were linked.');
      }
    } catch (error) {
      console.error('❌ Error linking nodes:', error);
    }
  }

  private getNodeDataPreview(node: any): string {
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
