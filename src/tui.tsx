import React from 'react';
import { render } from 'ink';
import { App } from './external/tui/app.js';
import { createDatabaseClient } from './external/database/client.js';
import { SqliteNodeRepository } from './external/repositories/sqlite-node-repository.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';
import { HTTPCrawler } from './external/crawlers/http-crawler.js';
import { OllamaFlashcardGenerator } from './external/ai-services/ollama-flashcard-generator.js';
import { SqliteSearchIndex } from './external/search-index/sqlite-search-index.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { GetNodeUseCase } from './application/use-cases/get-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { LinkNodesUseCase } from './application/use-cases/link-nodes.js';
import { SearchNodesUseCase } from './application/use-cases/search-nodes.js';
import { GenerateFlashcardsUseCase } from './application/use-cases/generate-flashcards.js';
import { GetDueFlashcardsUseCase } from './application/use-cases/get-due-flashcards.js';
import { ReviewFlashcardUseCase } from './application/use-cases/review-flashcard.js';

function run() {
  const nodeMapper = new NodeMapper();
  const db = createDatabaseClient(process.env.DATABASE_URL || 'file:local.db');
  const nodeRepository = new SqliteNodeRepository(db, nodeMapper);
  const searchIndex = new SqliteSearchIndex(db);
  const htmlGenerator = new HTMLGenerator();
  const crawler = new HTTPCrawler();
  const flashcardGenerator = new OllamaFlashcardGenerator();

  const createNode = new CreateNodeUseCase(nodeRepository, crawler, searchIndex);
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

  render(
    <App
      createNodeUseCase={createNode}
      linkNodesUseCase={linkNodes}
      searchNodesUseCase={searchNodes}
      getNodeUseCase={getNode}
      generateFlashcardsUseCase={generateFlashcards}
      publishSiteUseCase={publishSite}
      getDueFlashcardsUseCase={getDueFlashcards}
      reviewFlashcardUseCase={reviewFlashcard}
    />
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { run };
