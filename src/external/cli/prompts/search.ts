import autocomplete from 'inquirer-autocomplete-standalone';
import type { SearchNodesUseCase } from '../../../application/use-cases/search-nodes.js';
import type { SearchResult } from '../../../application/ports/node-repository.js';

interface SearchPromptOptions {
  withRelations?: boolean;
  filterResults?: (results: SearchResult[]) => SearchResult[];
  formatResult?: (result: SearchResult) => {
    name: string;
    value: string;
    description?: string;
  };
}

async function searchPrompt(
  searchNodesUseCase: SearchNodesUseCase,
  options?: SearchPromptOptions
): Promise<string> {
  const withRelations = options?.withRelations ?? false;
  const format =
    options?.formatResult ??
    (({ node, score, snippet }: SearchResult) => {
      const highlightedSnippet = snippet
        .replace(/<b>/g, '\x1b[1m')
        .replace(/<\/b>/g, '\x1b[0m');
      return {
        value: node.id,
        name: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(2)})`,
        description: highlightedSnippet,
      };
    });

  return autocomplete({
    message: 'Query:',
    emptyText: 'Enter a query to search...',
    pageSize: 20,
    source: async (input?: string) => {
      if (!input) {
        return [];
      }
      const result = await searchNodesUseCase.execute({
        query: input,
        withRelations,
      });
      if (!result.ok) {
        return [
          {
            name: `Error: ${result.error.message}`,
            value: '',
            disabled: true,
          },
        ];
      }
      let results = result.value;
      if (options?.filterResults) {
        results = options.filterResults(results);
      }
      return results.map(format);
    },
  });
}

export { searchPrompt };
export type { SearchPromptOptions };
