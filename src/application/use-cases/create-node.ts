import { NodeFactory } from '../../domain/node-factory.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { NodeType } from '../../domain/node.js';

type CreateNodeInput<T extends Record<string, unknown>> = {
  type: NodeType;
  title?: string;
  data: T;
  isPublic?: boolean;
};

class CreateNodeUseCase {
  constructor(
    private readonly factory: NodeFactory,
    private readonly repository: NodeRepository
  ) {}

  async execute<T extends Record<string, unknown>>(input: CreateNodeInput<T>) {
    try {
      const title =
        input.title || this.generateFallbackTitle(input.type, input.data);

      const node = this.factory.createNode(
        input.type,
        title,
        input.isPublic ?? false,
        input.data
      );
      await this.repository.save(node);
      return { ok: true as const, node };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }

  private generateFallbackTitle(
    type: NodeType,
    data: Record<string, unknown>
  ): string {
    switch (type) {
      case 'note':
        return 'Untitled Note';
      case 'link':
        return (data.url as string) || 'Untitled Link';
      case 'tag':
        return (data.name as string) || 'Untitled Tag';
      case 'flashcard':
        return (data.front as string) || 'Untitled Flashcard';
      default:
        return 'Untitled';
    }
  }
}

export { CreateNodeUseCase };
