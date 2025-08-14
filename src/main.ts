import { AjvValidator } from './external/validation/ajv-validator.js';
import { NodeFactory } from './domain/node-factory.js';
import { FileNodeRepository } from './external/repositories/file-node-repository.js';
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
    const repository = new FileNodeRepository('./data', mapper);
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
    const linkSchema = {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const flashcardSchema = {
      type: 'object',
      properties: { front: { type: 'string' }, back: { type: 'string' } },
      required: ['front', 'back'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const ideaSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    const atomSchema = {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    } satisfies JSONSchema;

    factory.registerSchema('link', linkSchema);
    factory.registerSchema('flashcard', flashcardSchema);
    factory.registerSchema('idea', ideaSchema);
    factory.registerSchema('atom', atomSchema);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new Application();
  app.run();
}

export { Application };
