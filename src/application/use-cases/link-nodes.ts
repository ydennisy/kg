import type { EdgeType } from '../../domain/node.js';
import type { NodeRepository } from '../ports/node-repository.js';

type LinkNodesInput = {
  sourceId: string;
  targetId: string;
  type?: EdgeType;
};

class LinkNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: LinkNodesInput) {
    try {
      await this.repository.link(input.sourceId, input.targetId, input.type);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }
}

export { LinkNodesUseCase };
