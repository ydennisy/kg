import { Command } from 'commander';
import type { PublishSiteUseCase } from '../../../application/use-cases/publish-site.js';

class PublishCommand {
  constructor(private readonly publishSiteUseCase: PublishSiteUseCase) {}

  register(program: Command): void {
    program
      .command('publish')
      .description('Publish public nodes to static site (./public)')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
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
}

export { PublishCommand };
