import { createDatabaseClient } from './external/database/client.js';
import { SqlNodeRepository } from './external/repositories/sql-node-repository.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';
import { HTTPCrawler } from './external/crawlers/http-crawler.js';
import { OllamaFlashcardGenerator } from './external/ai-services/ollama-flashcard-generator.js';
import { CLI } from './external/cli/cli.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { GetNodeUseCase } from './application/use-cases/get-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { LinkNodesUseCase } from './application/use-cases/link-nodes.js';
import { SearchNodesUseCase } from './application/use-cases/search-nodes.js';
import { GenerateFlashcardsUseCase } from './application/use-cases/generate-flashcards.js';

class Application {
  private cli: CLI;

  constructor() {
    const nodeMapper = new NodeMapper();

    // TODO: pass in from config
    const db = createDatabaseClient(
      process.env.DATABASE_URL || 'file:local.db'
    );
    const nodeRepository = new SqlNodeRepository(db, nodeMapper);
    const htmlGenerator = new HTMLGenerator();
    const crawler = new HTTPCrawler();
    const flashcardGenerator = new OllamaFlashcardGenerator();

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
    this.cli = new CLI(
      createNode,
      linkNodes,
      searchNodes,
      getNode,
      generateFlashcards,
      publishSite
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
