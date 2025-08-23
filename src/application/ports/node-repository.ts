import type { AnyNode } from '../../domain/node.js';
import type { EdgeType } from '../../domain/edge.js';

type SearchResult = {
  node: AnyNode;
  snippet: string;
  score: number;
};

interface NodeRepository {
  save(node: AnyNode): Promise<void>;
  link(sourceId: string, targetId: string, type?: EdgeType): Promise<void>;
  findAll(): Promise<AnyNode[]>;
  findById(id: string): Promise<AnyNode | null>;
  search(query: string): Promise<SearchResult[]>;
}

export type { NodeRepository, SearchResult };
