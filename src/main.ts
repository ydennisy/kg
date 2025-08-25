import { createDatabaseClient } from './external/database/client.js';
import { SqliteNodeRepository } from './external/repositories/sqlite-node-repository.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';
import { HTTPCrawler } from './external/crawlers/http-crawler.js';
import { OllamaFlashcardGenerator } from './external/ai-services/ollama-flashcard-generator.js';
import { OllamaFlashcardAnswerGrader } from './external/ai-services/ollama-flashcard-answer-grader.js';
import { CLI } from './external/cli/cli.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { GetNodeUseCase } from './application/use-cases/get-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { LinkNodesUseCase } from './application/use-cases/link-nodes.js';
import { SearchNodesUseCase } from './application/use-cases/search-nodes.js';
import { GenerateFlashcardsUseCase } from './application/use-cases/generate-flashcards.js';
import { GetDueFlashcardsUseCase } from './application/use-cases/get-due-flashcards.js';
import { ReviewFlashcardUseCase } from './application/use-cases/review-flashcard.js';
import { EvaluateFlashcardAnswerUseCase } from './application/use-cases/evaluate-flashcard-answer.js';

class Application {
  private cli: CLI;

  constructor() {
    const nodeMapper = new NodeMapper();

    // TODO: pass in from config
    const db = createDatabaseClient(
      process.env.DATABASE_URL || 'file:local.db'
    );
    const nodeRepository = new SqliteNodeRepository(db, nodeMapper);
    const htmlGenerator = new HTMLGenerator();
    const crawler = new HTTPCrawler();
    const flashcardGenerator = new OllamaFlashcardGenerator();
    const flashcardAnswerGrader = new OllamaFlashcardAnswerGrader();

    const createNode = new CreateNodeUseCase(nodeRepository, crawler);
    const linkNodes = new LinkNodesUseCase(nodeRepository);
    const searchNodes = new SearchNodesUseCase(nodeRepository);
    const getNode = new GetNodeUseCase(nodeRepository);
    const generateFlashcards = new GenerateFlashcardsUseCase(
      nodeRepository,
      flashcardGenerator
    );
    const publishSite = new PublishSiteUseCase(
      nodeRepository,
      htmlGenerator,
      './public'
    );
    const getDueFlashcards = new GetDueFlashcardsUseCase(nodeRepository);
    const reviewFlashcard = new ReviewFlashcardUseCase(nodeRepository);
    const evaluateFlashcardAnswer = new EvaluateFlashcardAnswerUseCase(
      flashcardAnswerGrader
    );
    this.cli = new CLI(
      createNode,
      linkNodes,
      searchNodes,
      getNode,
      generateFlashcards,
      publishSite,
      getDueFlashcards,
      reviewFlashcard,
      evaluateFlashcardAnswer
    );
  }

  public run(): void {
    this.cli.run(process.argv);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new Application();
  app.run();
}

export { Application };
