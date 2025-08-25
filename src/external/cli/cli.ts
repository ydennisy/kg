import { Command } from 'commander';
import packageJSON from '../../../package.json' with { type: 'json' };
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../application/use-cases/link-nodes.js';
import type { SearchNodesUseCase } from '../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../application/use-cases/get-node.js';
import type { GenerateFlashcardsUseCase } from '../../application/use-cases/generate-flashcards.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { GetDueFlashcardsUseCase } from '../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardUseCase } from '../../application/use-cases/review-flashcard.js';
import { CreateCommand } from './commands/create.js';
import { SearchCommand } from './commands/search.js';
import { GenerateFlashcardsCommand } from './commands/generate-flashcards.js';
import { PublishCommand } from './commands/publish.js';
import { ReviewCommand } from './commands/review.js';

class CLI {
  private readonly program: Command;

  constructor(
    createNodeUseCase: CreateNodeUseCase,
    linkNodesUseCase: LinkNodesUseCase,
    searchNodesUseCase: SearchNodesUseCase,
    getNodeUseCase: GetNodeUseCase,
    generateFlashcardsUseCase: GenerateFlashcardsUseCase,
    publishSiteUseCase: PublishSiteUseCase,
    getDueFlashcardsUseCase: GetDueFlashcardsUseCase,
    reviewFlashcardUseCase: ReviewFlashcardUseCase
  ) {
    this.program = new Command();
    this.program
      .name('kg')
      .description('Knowledge Graph CLI')
      .version(packageJSON.version);

    new CreateCommand(
      createNodeUseCase,
      linkNodesUseCase,
      searchNodesUseCase
    ).register(this.program);

    new SearchCommand(searchNodesUseCase, getNodeUseCase).register(this.program);

    new GenerateFlashcardsCommand(
      searchNodesUseCase,
      generateFlashcardsUseCase,
      createNodeUseCase,
      linkNodesUseCase
    ).register(this.program);

    new PublishCommand(publishSiteUseCase).register(this.program);

    new ReviewCommand(
      getDueFlashcardsUseCase,
      reviewFlashcardUseCase
    ).register(this.program);
  }

  run(argv?: string[]): void {
    this.program.parse(argv);
  }
}

export { CLI };
