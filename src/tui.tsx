import React from 'react';
import { render } from 'ink';
import { App } from './external/tui/app.js';
import { AjvValidator } from './external/validation/ajv-validator.js';
import { NodeFactory } from './domain/node-factory.js';
import { createDatabaseClient } from './external/database/client.js';
import { SqlNodeRepository } from './external/repositories/sql-node-repository.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';
import { HTTPCrawler } from './external/crawlers/http-crawler.js';
import { OllamaFlashcardGenerator } from './external/ai-services/ollama-flashcard-generator.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { GetNodeUseCase } from './application/use-cases/get-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { LinkNodesUseCase } from './application/use-cases/link-nodes.js';
import { SearchNodesUseCase } from './application/use-cases/search-nodes.js';
import { GenerateFlashcardsUseCase } from './application/use-cases/generate-flashcards.js';
import type { JSONSchema } from './domain/ports/validator.js';

function initSchemas(nodeFactory: NodeFactory) {
  const noteSchema = {
    type: 'object',
    properties: { content: { type: 'string' } },
    required: ['content'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const linkSchema = {
    type: 'object',
    properties: {
      url: { type: 'string' },
      text: { type: 'string' },
      html: { type: 'string' },
    },
    required: ['url', 'text', 'html'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const tagSchema = {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    additionalProperties: false,
  } satisfies JSONSchema;

  const flashcardSchema = {
    type: 'object',
    properties: { front: { type: 'string' }, back: { type: 'string' } },
    required: ['front', 'back'],
    additionalProperties: false,
  } satisfies JSONSchema;

  nodeFactory.registerSchema('note', noteSchema);
  nodeFactory.registerSchema('link', linkSchema);
  nodeFactory.registerSchema('tag', tagSchema);
  nodeFactory.registerSchema('flashcard', flashcardSchema);
}

function run() {
  const validator = new AjvValidator();
  const nodeFactory = new NodeFactory(validator);
  initSchemas(nodeFactory);
  const nodeMapper = new NodeMapper(nodeFactory);
  const db = createDatabaseClient(process.env.DATABASE_URL || 'file:local.db');
  const nodeRepository = new SqlNodeRepository(db, nodeMapper);
  const htmlGenerator = new HTMLGenerator();
  const crawler = new HTTPCrawler();
  const flashcardGenerator = new OllamaFlashcardGenerator();

  const createNode = new CreateNodeUseCase(nodeFactory, nodeRepository, crawler);
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

  render(
    <App
      createNodeUseCase={createNode}
      linkNodesUseCase={linkNodes}
      searchNodesUseCase={searchNodes}
      getNodeUseCase={getNode}
      generateFlashcardsUseCase={generateFlashcards}
      publishSiteUseCase={publishSite}
    />
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { run };
