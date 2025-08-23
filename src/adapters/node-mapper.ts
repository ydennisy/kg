import type { AnyNode, NodeType } from '../domain/node.js';
import type { NodeRecord } from '../external/database/schema.js';

class NodeMapper {
  public toDomain(record: NodeRecord): AnyNode {}

  public toPersistence(node: AnyNode): NodeRecord {
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
