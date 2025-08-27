import type { EdgeType } from '../../domain/types.js';
import type { NodeRepository } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

type LinkNodesInput = {
  fromId: string;
  toId: string;
  type?: EdgeType;
  isBidirectional?: boolean;
};

class LinkNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(input: LinkNodesInput): Promise<Result<void, Error>> {
    try {
      const fromNode = await this.repository.findById(input.fromId);
      const toNode = await this.repository.findById(input.toId);

      if (!fromNode) {
        return Result.failure(new Error(`Node not found: ${input.fromId}`));
      }

      if (!toNode) {
        return Result.failure(new Error(`Node not found: ${input.toId}`));
      }

      // Set defaults when no input provided
      let type = input.type ? input.type : 'related_to';
      let isBidirectional: boolean = input.isBidirectional
        ? input.isBidirectional
        : true;

      // Case for when flashcard is derived from a link or note
      if (
        fromNode.type === 'flashcard' &&
        (toNode.type === 'link' || toNode.type === 'note')
      ) {
        type = 'derived_from';
        isBidirectional = false;
      }

      await this.repository.link(
        input.fromId,
        input.toId,
        type,
        isBidirectional
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
