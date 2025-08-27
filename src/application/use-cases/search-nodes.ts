import type { NodeRepository, SearchResult } from '../ports/node-repository.js';
import { Result } from '../../shared/result.js';

type SearchNodesInput = {
  query: string;
  withRelations?: boolean;
};

class SearchNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(
    input: SearchNodesInput
  ): Promise<Result<Array<SearchResult>, Error>> {
    if (!input.query.trim()) {
      return Result.success([]);
    }

    try {
      const result = await this.repository.search(
        input.query,
        input.withRelations
      );
      return Result.success(result);
    } catch (err) {
      return Result.failure(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}

export { SearchNodesUseCase };
