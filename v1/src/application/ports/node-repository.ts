import type { Node } from '../../domain/node.js';

type SearchResult = {
  node: Node;
  score: number;
};

interface NodeRepository {
  save(node: Node): Promise<void>;
  findAll(): Promise<Node[]>;
  findById(id: string): Promise<Node | null>;
  searchNodes(query: string): Promise<SearchResult[]>;
  // findByType(type: string): Promise<Node[]>;
  // findPublic(): Promise<Node[]>;
}

export type { NodeRepository, SearchResult };
