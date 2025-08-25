import type { AnyNode, NodeType, EdgeType } from '../../domain/types.js';
import type { FlashcardNode } from '../../domain/flashcard-node.js';

type SearchResult = {
  node: AnyNode;
  snippet: string;
  score: number;
};

interface NodeRepository {
  save(node: AnyNode): Promise<void>;
  update(node: AnyNode): Promise<void>;
  delete(id: string): Promise<void>;
  link(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    isBidirectional: boolean
  ): Promise<void>;
  findAll(): Promise<AnyNode[]>;
  findById(id: string, withRelations?: boolean): Promise<AnyNode | null>;
  search(query: string, withRelations?: boolean): Promise<SearchResult[]>;
  findDueFlashcards(date: Date, limit: number): Promise<FlashcardNode[]>;
}

export type { NodeRepository, SearchResult };
