import { NodeFactory } from '../domain/node-factory.js';
import type { Node, NodeType } from '../domain/node.js';
import type { NodeRecord } from '../external/database/schemas.js';

class NodeMapper {
  constructor(private nodeFactory: NodeFactory) {}

  public toDomain(record: NodeRecord): Node {
    const node = this.nodeFactory.hydrateNode(
      record.id,
      record.type as NodeType, // TODO: check this invariant
      record.title,
      record.isPublic,
      new Date(record.createdAt),
      new Date(record.updatedAt),
      record.data
    );

    return node;
  }

  public toPersistence(node: Node): NodeRecord {
    return {
      id: node.id,
      type: node.type,
      title: node.title,
      isPublic: node.isPublic,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      data: node.data,
    };
  }
}

export { NodeMapper };
