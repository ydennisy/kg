import type { EdgeType } from '../../domain/types.js';
import type { NodeRepository } from '../ports/node-repository.js';

type LinkNodesInput = {
  fromId: string;
  toId: string;
  type: EdgeType;
  isBidirectional: boolean;
};

class LinkNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: LinkNodesInput) {
    try {
      await this.repository.link(
        input.fromId,
        input.toId,
        input.type,
        input.isBidirectional
      );
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }
}

export { LinkNodesUseCase };
