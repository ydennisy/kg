import type { Node } from '../../domain/node.js';

interface NodeRepository {
  save(node: Node): Promise<void>;
  findAll(): Promise<Node[]>;
  findById(id: string): Promise<Node | null>;
  // findByType(type: string): Promise<Node[]>;
  // findPublic(): Promise<Node[]>;
}

export type { NodeRepository };
