import { AjvValidator } from './external/validation/ajv-validator.js';
import { NodeFactory } from './domain/node-factory.js';
import { FileNodeRepository } from './external/repositories/file-node-repository.js';
import { createDatabaseClient } from './external/database/client.js';
import { SqlNodeRepository } from './external/repositories/sql-node-repository.js';
import { CreateNodeUseCase } from './application/use-cases/create-node.js';
import { PublishSiteUseCase } from './application/use-cases/publish-site.js';
import { HTMLGenerator } from './external/publishers/html-generator.js';
import { NodeMapper } from './adapters/node-mapper.js';
import { CLI } from './external/cli/cli.js';
import type { JSONSchema } from './domain/ports/validator.js';

class Application {
  private cli: CLI;

  constructor() {
    const validator = new AjvValidator();
    const factory = new NodeFactory(validator);
    this.initSchemas(factory);
    const mapper = new NodeMapper(factory);
    // const repository = new FileNodeRepository('./data', mapper);
    const db = createDatabaseClient();
    const repository = new SqlNodeRepository(db, mapper);
    const htmlGenerator = new HTMLGenerator();
    const createNode = new CreateNodeUseCase(factory, repository);
    const publishSite = new PublishSiteUseCase(
      repository,
      htmlGenerator,
      './public'
    );
    this.cli = new CLI(createNode, publishSite);
  }

  public run(): void {
    this.cli.run(process.argv);
  }

  private initSchemas(factory: NodeFactory) {
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

    factory.registerSchema('note', noteSchema);
    factory.registerSchema('link', linkSchema);
    factory.registerSchema('tag', tagSchema);
    factory.registerSchema('flashcard', flashcardSchema);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new Application();
  app.run();
}

export { Application };
