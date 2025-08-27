import type { EdgeType } from '../../domain/types.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

type LinkNodesInput = {
  fromId: string;
  toId: string;
  type: EdgeType;
  isBidirectional: boolean;
};

class LinkNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: LinkNodesInput): Promise<Result<void, Error>> {
    try {
      await this.repository.link(
        input.fromId,
        input.toId,
        input.type,
        input.isBidirectional
      );
      return Result.success(undefined);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { LinkNodesUseCase };
