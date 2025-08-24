import type { AnyNode, NodeType, EdgeType } from '../../domain/types.js';

type SearchResult = {
  nodeId: string;
  type: NodeType;
  title: string;
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
