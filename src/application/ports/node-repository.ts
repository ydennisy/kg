import type { Node, EdgeType } from '../../domain/node.js';

type SearchResult = {
  node: Node;
  snippet: string;
  score: number;
};

interface NodeRepository {
  save(node: Node): Promise<void>;
  link(sourceId: string, targetId: string, type?: EdgeType): Promise<void>;
  findAll(): Promise<Node[]>;
  findById(id: string): Promise<Node | null>;
  search(query: string): Promise<SearchResult[]>;
}

export type { NodeRepository, SearchResult };
