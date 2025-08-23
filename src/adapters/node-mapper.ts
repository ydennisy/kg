import type { AnyNode, NodeType } from '../domain/node.js';
import type { NodeRecord } from '../external/database/schema.js';
import { NoteNode } from '../domain/note-node.js';
import { LinkNode } from '../domain/link-node.js';
import { TagNode } from '../domain/tag-node.js';
import { FlashcardNode } from '../domain/flashcard-node.js';

class NodeMapper {
  public toDomain(record: NodeRecord): AnyNode {
    const baseProps = {
      id: record.id,
      version: 1,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      isPublic: record.isPublic,
    };

    switch (record.type) {
      case 'note':
        return NoteNode.hydrate({
          ...baseProps,
          title: record.title,
          data: record.data as { content: string },
        });

      case 'link':
        return LinkNode.hydrate({
          ...baseProps,
          title: record.title || undefined,
          data: record.data as {
            url: string;
            crawled: {
              title: string | undefined;
              text: string | undefined;
              html: string | undefined;
            };
          },
        });

      case 'tag':
        return TagNode.hydrate({
          ...baseProps,
          data: record.data as { name: string },
        });

      case 'flashcard':
        return FlashcardNode.hydrate({
          ...baseProps,
          data: record.data as { front: string; back: string },
        });

      default:
        throw new Error(`Unknown node type: ${record.type}`);
    }
  }

  public toRecord(node: AnyNode): NodeRecord {
    let data: Record<string, any>;

    switch (node.type) {
      case 'note':
        data = { content: (node as NoteNode).content };
        break;
      case 'link':
      case 'tag':
      case 'flashcard':
        data = (node as LinkNode | TagNode | FlashcardNode).data;
        break;
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }

    return {
      id: node.id,
      type: node.type,
      title: node.title,
      isPublic: node.isPublic,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      data,
    };
  }
}

export { NodeMapper };
