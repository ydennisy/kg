import type { AnyNode } from '../../domain/types.js';

interface SearchIndex {
  indexNode(node: AnyNode): Promise<void>;
  removeNode(id: string): Promise<void>;
}

export type { SearchIndex };
