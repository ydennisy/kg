import type { AnyNode } from '../../domain/types.js';
import type { NodeRepository } from '../ports/node-repository.js';

type GetNodeInput = {
  id: string;
};

class GetNodeUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(
    input: GetNodeInput
  ): Promise<{ ok: true; result: AnyNode } | { ok: false; error: string }> {
    try {
      const result = await this.repository.findById(input.id);
      if (!result) {
        return { ok: false, error: 'Node not found' };
      }
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { GetNodeUseCase };
