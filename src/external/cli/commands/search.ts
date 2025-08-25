import { Command } from 'commander';
import { editor } from '@inquirer/prompts';
import type { SearchNodesUseCase } from '../../../application/use-cases/search-nodes.js';
import type { GetNodeUseCase } from '../../../application/use-cases/get-node.js';
import { searchPrompt } from '../prompts/search.js';

interface RelatedNodeInfo {
  node: { title: string };
  relationship: { type: string };
}

function hasRelations(node: unknown): node is { relatedNodes: RelatedNodeInfo[] } {
  return (
    typeof node === 'object' &&
    node !== null &&
    'relatedNodes' in node &&
    Array.isArray((node as { relatedNodes?: unknown }).relatedNodes)
  );
}

class SearchCommand {
  constructor(
    private readonly searchNodesUseCase: SearchNodesUseCase,
    private readonly getNodeUseCase: GetNodeUseCase
  ) {}

  register(program: Command): void {
    program
      .command('search')
      .description('Search nodes')
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
    const nodeId = await searchPrompt(this.searchNodesUseCase, {
      withRelations: true,
      formatResult: ({ node, score, snippet }) => {
        const highlightedSnippet = snippet
          .replace(/<b>/g, '\x1b[1m')
          .replace(/<\/b>/g, '\x1b[0m');
        const relatedPreview = hasRelations(node)
          ? node.relatedNodes
              .slice(0, 3)
              .map(
                ({ node: r, relationship }) =>
                  `→ ${r.title} (${relationship.type})`
              )
              .join(', ')
          : undefined;
        const description = relatedPreview
          ? `${highlightedSnippet}\n${relatedPreview}`
          : `${highlightedSnippet}`;
        return {
          value: node.id,
          name: `[${node.type.toUpperCase()}] ${node.title} (${score.toFixed(
            2
          )})`,
          description,
        };
      },
    });

    const result = await this.getNodeUseCase.execute({ id: nodeId });

    if (!result.ok) {
      console.error(`❌ Error fetching node: ${result.error}`);
      process.exit(1);
    }

    await editor({
      message: 'Read only node was displayed in the editor',
      default: JSON.stringify(result.result, undefined, 2),
      waitForUseInput: false,
    });
  }
}

export { SearchCommand };
