import type { Node } from '../../domain/node.js';

interface NodeRepository {
  save(node: Node): Promise<void>;
  findById(id: string): Promise<Node | null>;
  list(): Promise<Node[]>;
}

export type { NodeRepository };
