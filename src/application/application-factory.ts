import { NodeMapper } from '../adapters/node-mapper.js';
import { OllamaFlashcardAnswerGrader } from '../external/ai-services/ollama-flashcard-answer-grader.js';
import { OllamaFlashcardGenerator } from '../external/ai-services/ollama-flashcard-generator.js';
import { HTTPCrawler } from '../external/crawlers/http-crawler.js';
import { createDatabaseClient } from '../external/database/client.js';
import { HTMLGenerator } from '../external/publishers/html-generator.js';
import { SqliteNodeRepository } from '../external/repositories/sqlite-node-repository.js';
import { CreateNodeUseCase } from './use-cases/create-node.js';
import { EvaluateFlashcardAnswerUseCase } from './use-cases/evaluate-flashcard-answer.js';
import { GenerateFlashcardsUseCase } from './use-cases/generate-flashcards.js';
import { GetDueFlashcardsUseCase } from './use-cases/get-due-flashcards.js';
import { GetNodeUseCase } from './use-cases/get-node.js';
import { LinkNodesUseCase } from './use-cases/link-nodes.js';
import { PublishSiteUseCase } from './use-cases/publish-site.js';
import { ReviewFlashcardUseCase } from './use-cases/review-flashcard.js';
import { SearchNodesUseCase } from './use-cases/search-nodes.js';

type AppConfig = {
  databaseUrl: string;
};

class ApplicationFactory {
  constructor(private config: AppConfig) {}

  public createUseCases() {
    const db = createDatabaseClient(`file:${this.config.databaseUrl}`);
    const mapper = new NodeMapper();
    const repository = new SqliteNodeRepository(db, mapper);
    const htmlGenerator = new HTMLGenerator();
    const crawler = new HTTPCrawler();
    const flashcardGenerator = new OllamaFlashcardGenerator();
    const flashcardAnswerGrader = new OllamaFlashcardAnswerGrader();

    // Use cases
    const createNode = new CreateNodeUseCase(repository, crawler);
    const getNode = new GetNodeUseCase(repository);
    const searchNodes = new SearchNodesUseCase(repository);
    const linkNodes = new LinkNodesUseCase(repository);

    // Flashcard specific
    const generateFlashcards = new GenerateFlashcardsUseCase(
      repository,
      flashcardGenerator
    );
    const getDueFlashcards = new GetDueFlashcardsUseCase(repository);
    const reviewFlashcard = new ReviewFlashcardUseCase(repository);
    const evaluateFlashcardAnswer = new EvaluateFlashcardAnswerUseCase(
      flashcardAnswerGrader
    );

    // Publishing
    const publishSite = new PublishSiteUseCase(repository, htmlGenerator);

    return {
      createNode,
      getNode,
      searchNodes,
      linkNodes,
      generateFlashcards,
      getDueFlashcards,
      reviewFlashcard,
      evaluateFlashcardAnswer,
      publishSite,
    };
  }
}

export { ApplicationFactory };
export type { AppConfig };
