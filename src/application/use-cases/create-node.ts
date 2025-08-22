import { NodeFactory } from '../../domain/node-factory.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { NodeType } from '../../domain/node.js';
import type { Crawler } from '../ports/crawler.js';

type CreateNodeInput<T extends Record<string, unknown>> = {
  type: NodeType;
  title?: string | undefined;
  data: T;
  isPublic?: boolean;
};

class CreateNodeUseCase {
  constructor(
    private readonly factory: NodeFactory,
    private readonly repository: NodeRepository,
    private readonly crawler: Crawler
  ) {}

  async execute<T extends Record<string, unknown>>(input: CreateNodeInput<T>) {
    try {
      let { title } = input;
      const { type, isPublic, data } = input;

      if (type === 'link' && typeof data.url === 'string') {
        const crawled = await this.crawler.fetch(data.url);
        const text = crawled.markdown ? crawled.markdown : crawled.text;
        data.text = text;
        data.html = crawled.html;
        title = crawled.title ?? data.url;
      } else {
        title = title || this.ensureTitle(type, input.data);
      }

      const node = this.factory.createNode(
        type,
        title,
        isPublic ?? false,
        data
      );
      await this.repository.save(node);
      return { ok: true as const, result: node };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }

  private ensureTitle(type: NodeType, data: Record<string, unknown>): string {
    switch (type) {
      case 'note':
        return 'Untitled Note';
      case 'link':
        return (data.url as string) || 'Untitled Link';
      case 'tag':
        return data.name as string;
      case 'flashcard':
        return data.front as string;
      default:
        return 'Untitled';
    }
  }
}

export { CreateNodeUseCase };
