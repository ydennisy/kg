import type { NodeRepository, SearchResult } from '../ports/node-repository.js';

type SearchNodesInput = {
  query: string;
};

class SearchNodesUseCase {
  constructor(private readonly repository: NodeRepository) {}

  async execute(
    input: SearchNodesInput
  ): Promise<
    { ok: true; result: Array<SearchResult> } | { ok: false; error: string }
  > {
    try {
      const result = await this.repository.search(input.query);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export { SearchNodesUseCase };
