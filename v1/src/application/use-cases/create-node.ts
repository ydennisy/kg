import { NodeFactory } from '../../domain/node-factory.js';
import type { NodeRepository } from '../ports/node-repository.js';
import type { NodeType } from '../../domain/node.js';

type CreateNodeInput<T extends Record<string, unknown>> = {
  type: NodeType;
  data: T;
  tags?: string[];
  isPublic?: boolean;
};

class CreateNodeUseCase {
  constructor(
    private readonly factory: NodeFactory,
    private readonly repository: NodeRepository
  ) {}

  async execute<T extends Record<string, unknown>>(input: CreateNodeInput<T>) {
    try {
      const node = this.factory.createNode(
        input.type,
        input.data,
        input.tags ?? [],
        input.isPublic ?? false
      );
      await this.repository.save(node);
      return { ok: true as const, node };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }
}

export { CreateNodeUseCase };
