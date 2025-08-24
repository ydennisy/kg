import type { AnyNode, NodeType } from '../domain/node.js';
import type {
  AnyNodeRecord,
  NodeRecord,
  NoteNodeRecord,
  LinkNodeRecord,
  TagNodeRecord,
  FlashcardNodeRecord,
} from '../external/database/schema.js';
import { NoteNode } from '../domain/note-node.js';
import { LinkNode } from '../domain/link-node.js';
import { TagNode } from '../domain/tag-node.js';
import { FlashcardNode } from '../domain/flashcard-node.js';

class NodeMapper {
  public toDomain(record: AnyNodeRecord): AnyNode {
    const baseProps = {
      id: record.id,
      version: record.version,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      isPublic: record.isPublic,
    };

    switch (record.type) {
      case 'note':
        const noteRecord = record as any;
        return NoteNode.hydrate({
          ...baseProps,
          title: record.title,
          data: { content: noteRecord.noteNode.content },
        });

      case 'link':
        const linkRecord = record as any;
        return LinkNode.hydrate({
          ...baseProps,
          title: record.title || undefined,
          data: {
            url: linkRecord.linkNode.url,
            crawled: {
              title: linkRecord.linkNode.crawledTitle || undefined,
              text: linkRecord.linkNode.crawledText || undefined,
              html: linkRecord.linkNode.crawledHtml || undefined,
            },
          },
        });

      case 'tag':
        const tagRecord = record as any;
        return TagNode.hydrate({
          ...baseProps,
          data: { name: tagRecord.tagNode.name },
        });

      case 'flashcard':
        const flashcardRecord = record as any;
        return FlashcardNode.hydrate({
          ...baseProps,
          data: {
            front: flashcardRecord.flashcardNode.front,
            back: flashcardRecord.flashcardNode.back,
          },
        });

      default:
        throw new Error(`Unknown node type: ${record.type}`);
    }
  }

  public toRecords(node: AnyNode): {
    nodeRecord: NodeRecord;
    typeRecord:
      | NoteNodeRecord
      | LinkNodeRecord
      | TagNodeRecord
      | FlashcardNodeRecord;
  } {
    const { type } = node;

    const nodeRecord = {
      id: node.id,
      type: node.type,
      title: node.title,
      version: node.version,
      isPublic: node.isPublic,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };

    let typeRecord: any;

    switch (type) {
      case 'note':
        typeRecord = {
          nodeId: node.id,
          content: node.content,
        };
        break;

      case 'link':
        const linkNode = node;
        typeRecord = {
          nodeId: node.id,
          url: linkNode.data.url,
          crawledTitle: linkNode.data.crawled.title || null,
          crawledText: linkNode.data.crawled.text || null,
          crawledHtml: linkNode.data.crawled.html || null,
        };
        break;

      case 'tag':
        typeRecord = {
          nodeId: node.id,
          name: node.data.name,
        };
        break;

      case 'flashcard':
        typeRecord = {
          nodeId: node.id,
          front: node.data.front,
          back: node.data.back,
        };
        break;

      default:
        throw new Error(`Unknown node type: ${type}`);
    }

    return { nodeRecord, typeRecord };
  }

  // Legacy method for compatibility - can be removed once repository is updated
  public toRecord(node: AnyNode): any {
    return this.toRecords(node);
  }
}

export { NodeMapper };
