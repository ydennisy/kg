import { NodeFactory } from '../domain/node-factory.js';
import type { Node, NodeType } from '../domain/node.js';

interface NodePersistenceModel {
  id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
  data: Record<string, any>;
}

class NodeMapper {
  constructor(private nodeFactory: NodeFactory) {}

  public toDomain(model: NodePersistenceModel): Node {
    const node = this.nodeFactory.hydrateNode(
      model.id,
      model.type as NodeType, // TODO: check this invariant
      model.data,
      model.tags,
      new Date(model.createdAt),
      new Date(model.updatedAt),
      model.isPublic
    );

    return node;
  }

  public toPersistence(node: Node): NodePersistenceModel {
    return {
      id: node.id,
      type: node.type,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      tags: node.tags,
      isPublic: node.isPublic,
      data: node.data,
    };
  }
}

export { NodeMapper };
