import { Command } from 'commander';
import { select, input, confirm } from '@inquirer/prompts';
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { NodeType } from '../../domain/node.js';

export class CLI {
  private program: Command;

  constructor(
    private createNodeUseCase: CreateNodeUseCase,
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
      .version('0.0.1');

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
          { name: 'Link', value: 'link' as NodeType },
          { name: 'Flashcard', value: 'flashcard' as NodeType },
          { name: 'Idea', value: 'idea' as NodeType },
          { name: 'Atom', value: 'atom' as NodeType },
        ],
      });

      // Step 2: Collect data based on node type
      const data = await this.collectNodeData(nodeType);

      // Step 3: Collect tags
      const tagsInput = await input({
        message: 'Tags (optional, comma-separated):',
        default: '',
      });
      
      const tags = tagsInput.trim() 
        ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      // Step 4: Ask if node should be public
      const isPublic = await confirm({
        message: 'Make this node public?',
        default: false,
      });

      // Step 5: Create the node
      const result = await this.createNodeUseCase.execute({
        type: nodeType,
        data,
        tags,
        isPublic,
      });

      if (result.ok) {
        console.log(`✅ Created ${nodeType} node with ID: ${result.node.id}`);
      } else {
        console.error(`❌ Error creating node: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
  }

  private async collectNodeData(nodeType: NodeType): Promise<Record<string, unknown>> {
    switch (nodeType) {
      case 'link':
        return {
          url: await input({
            message: 'Enter URL:',
            validate: (value: string) => value.trim().length > 0 || 'URL is required',
          }),
        };
      
      case 'flashcard':
        return {
          front: await input({
            message: 'Enter front text:',
            validate: (value: string) => value.trim().length > 0 || 'Front text is required',
          }),
          back: await input({
            message: 'Enter back text:',
            validate: (value: string) => value.trim().length > 0 || 'Back text is required',
          }),
        };
      
      case 'idea':
        return {
          content: await input({
            message: 'Enter idea content:',
            validate: (value: string) => value.trim().length > 0 || 'Content is required',
          }),
        };
      
      case 'atom':
        return {
          content: await input({
            message: 'Enter atom content:',
            validate: (value: string) => value.trim().length > 0 || 'Content is required',
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
        console.log(`✅ Successfully published ${result.filesGenerated} files to ${result.outputDir}`);
      } else {
        console.error(`❌ Error publishing site: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
  }
}
