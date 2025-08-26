import { Command } from 'commander';
import packageJSON from '../../../package.json' with { type: 'json' };
import { CreateCommand } from './commands/create.js';
import { SearchCommand } from './commands/search.js';
import { GenerateFlashcardsCommand } from './commands/generate-flashcards.js';
import { PublishCommand } from './commands/publish.js';
import { ReviewCommand } from './commands/review.js';
import type { CreateNodeUseCase } from '../../application/use-cases/create-node.js';
import type { LinkNodesUseCase } from '../../application/use-cases/link-nodes.js';
import type { SearchNodesUseCase } from '../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../application/use-cases/get-node.js';
import type { GenerateFlashcardsUseCase } from '../../application/use-cases/generate-flashcards.js';
import type { PublishSiteUseCase } from '../../application/use-cases/publish-site.js';
import type { GetDueFlashcardsUseCase } from '../../application/use-cases/get-due-flashcards.js';
import type { ReviewFlashcardUseCase } from '../../application/use-cases/review-flashcard.js';
import type { EvaluateFlashcardAnswerUseCase } from '../../application/use-cases/evaluate-flashcard-answer.js';

type UseCases = {
  createNode: CreateNodeUseCase;
  linkNodes: LinkNodesUseCase;
  searchNodes: SearchNodesUseCase;
  getNode: GetNodeUseCase;
  generateFlashcards: GenerateFlashcardsUseCase;
  publishSite: PublishSiteUseCase;
  getDueFlashcards: GetDueFlashcardsUseCase;
  reviewFlashcard: ReviewFlashcardUseCase;
  evaluateFlashcardAnswer: EvaluateFlashcardAnswerUseCase;
};

class CLI {
  private readonly program: Command;

  constructor(useCases: UseCases) {
    this.program = new Command();
    this.program
      .name('kg')
      .description('Knowledge Graph CLI')
      .version(packageJSON.version);

    new CreateCommand(
      useCases.createNode,
      useCases.linkNodes,
      useCases.searchNodes
    ).register(this.program);

    new SearchCommand(useCases.searchNodes, useCases.getNode).register(
      this.program
    );

    new GenerateFlashcardsCommand(
      useCases.searchNodes,
      useCases.generateFlashcards,
      useCases.createNode,
      useCases.linkNodes
    ).register(this.program);

    new PublishCommand(useCases.publishSite).register(this.program);

    new ReviewCommand(
      useCases.getDueFlashcards,
      useCases.reviewFlashcard,
      useCases.evaluateFlashcardAnswer
    ).register(this.program);
  }

  run(argv?: string[]): void {
    this.program.parse(argv);
  }
}

export { CLI };
