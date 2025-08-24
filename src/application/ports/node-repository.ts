import type { AnyNode, EdgeType } from '../../domain/types.js';

type SearchResult = {
  node: AnyNode;
  snippet: string;
  score: number;
};

interface NodeRepository {
  save(node: AnyNode): Promise<void>;
  link(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    isBidirectional: boolean
  ): Promise<void>;
  findAll(): Promise<AnyNode[]>;
  findById(id: string, withRelations?: boolean): Promise<AnyNode | null>;
  search(query: string, withRelations?: boolean): Promise<SearchResult[]>;
}

export type { NodeRepository, SearchResult };
