import type { AnyNode } from '../../domain/types.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

type GetNodeInput = {
  id: string;
};

class GetNodeUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: GetNodeInput): Promise<Result<AnyNode, Error>> {
    try {
      const result = await this.repository.findById(input.id, false);
      if (!result) {
        return Result.failure(new Error('Node not found'));
      }
      return Result.success(result);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { GetNodeUseCase };
