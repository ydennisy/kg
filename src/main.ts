import { AjvValidator } from './external/validation/ajv-validator.js';
import { NodeFactory } from './domain/node-factory.js';
import { createDatabaseClient } from './external/database/client.js';
import { SqlNodeRepository } from './external/repositories/sql-node-repository.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';

import { CLI } from './external/cli/cli.js';
import type { JSONSchema } from './domain/ports/validator.js';
import { LinkNodesUseCase } from './application/use-cases/link-nodes.js';

class Application {
  private cli: CLI;

  constructor() {
    const validator = new AjvValidator();
    const nodeFactory = new NodeFactory(validator);
    this.initSchemas(nodeFactory);
    const nodeMapper = new NodeMapper(nodeFactory);

    // TODO: pass in from config
    const db = createDatabaseClient(
      process.env.DATABASE_URL || 'file:local.db'
    );
    const nodeRepository = new SqlNodeRepository(db, nodeMapper);
    const htmlGenerator = new HTMLGenerator();

    const createNode = new CreateNodeUseCase(nodeFactory, nodeRepository);
    const linkNodes = new LinkNodesUseCase(nodeRepository);
    const publishSite = new PublishSiteUseCase(
      nodeRepository,
      htmlGenerator,
      './public'
    );
    this.cli = new CLI(
      createNode,
      publishSite,
      linkNodes
      // nodeRepository,
      // edgeRepository,
      // edgeFactory
    );
  }

  public run(): void {
    this.cli.run(process.argv);
  }

  private initSchemas(nodeFactory: NodeFactory) {
    const noteSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new Application();
  app.run();
}

export { Application };
