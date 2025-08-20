import type { Node } from '../../domain/node.js';

type SearchResult = {
  node: Node;
  snippet: string;
  score: number;
};

interface NodeRepository {
  save(node: Node): Promise<void>;
  findAll(): Promise<Node[]>;
  findById(id: string): Promise<Node | null>;
  search(query: string): Promise<SearchResult[]>;
}

export type { NodeRepository, SearchResult };
