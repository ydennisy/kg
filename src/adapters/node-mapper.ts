import { NoteNode } from '../domain/note-node.js';
import { LinkNode } from '../domain/link-node.js';
import { TagNode } from '../domain/tag-node.js';
import { FlashcardNode } from '../domain/flashcard-node.js';
import type { AnyNode, NodeType } from '../domain/types.js';
import type {
  NodeRecord,
  AnyNodeRecord,
  NoteNodeRecord,
  LinkNodeRecord,
  TagNodeRecord,
  FlashcardNodeRecord,
  NodeWithNoteRecord,
  NodeWithLinkRecord,
  NodeWithTagRecord,
  NodeWithFlashcardRecord,
} from '../external/database/schema.js';

// Maps NodeType to the domain entity class
type NodeEntityMap = {
  note: NoteNode;
  link: LinkNode;
  tag: TagNode;
  flashcard: FlashcardNode;
};

// Maps NodeType to the full, joined database record type
type NodeRecordMap = {
  note: NodeWithNoteRecord;
  link: NodeWithLinkRecord;
  tag: NodeWithTagRecord;
  flashcard: NodeWithFlashcardRecord;
};

// Maps NodeType to the type-specific database record
type TypeRecordMap = {
  note: NoteNodeRecord;
  link: LinkNodeRecord;
  tag: TagNodeRecord;
  flashcard: FlashcardNodeRecord;
};

// A fully type-safe MapperConfig using our lookup maps
type MapperConfig = {
  [T in NodeType]: {
    toDomain: (record: NodeRecordMap[T]) => NodeEntityMap[T];
    toTypeRecord: (node: NodeEntityMap[T]) => Omit<TypeRecordMap[T], 'nodeId'>;
  };
};

// --- Static Mapper Configuration ---
const mappers: MapperConfig = {
  note: {
    toDomain: (record: NodeWithNoteRecord) =>
      NoteNode.hydrate({
        id: record.id,
        version: record.version,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        isPublic: record.isPublic,
        title: record.title,
        data: { content: record.noteNode.content },
      }),
    toTypeRecord: (node: NoteNode): Omit<NoteNodeRecord, 'nodeId'> => ({
      content: node.content,
    }),
  },
  link: {
    toDomain: (record: NodeWithLinkRecord) =>
      LinkNode.hydrate({
        id: record.id,
        version: record.version,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        isPublic: record.isPublic,
        title: record.title || undefined,
        data: {
          url: record.linkNode.url,
          crawled: {
            title: record.linkNode.crawledTitle || undefined,
            text: record.linkNode.crawledText || undefined,
            html: record.linkNode.crawledHtml || undefined,
          },
        },
      }),
    toTypeRecord: (node: LinkNode): Omit<LinkNodeRecord, 'nodeId'> => ({
      url: node.data.url,
      crawledTitle: node.data.crawled.title || null,
      crawledText: node.data.crawled.text || null,
      crawledHtml: node.data.crawled.html || null,
    }),
  },
  tag: {
    toDomain: (record: NodeWithTagRecord) =>
      TagNode.hydrate({
        id: record.id,
        version: record.version,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        isPublic: record.isPublic,
        data: { name: record.tagNode.name },
      }),
    toTypeRecord: (node: TagNode): Omit<TagNodeRecord, 'nodeId'> => ({
      name: node.data.name,
    }),
  },
  flashcard: {
    toDomain: (record: NodeWithFlashcardRecord) =>
      FlashcardNode.hydrate({
        id: record.id,
        version: record.version,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        isPublic: record.isPublic,
        data: {
          front: record.flashcardNode.front,
          back: record.flashcardNode.back,
        },
      }),
    toTypeRecord: (
      node: FlashcardNode
    ): Omit<FlashcardNodeRecord, 'nodeId'> => ({
      front: node.data.front,
      back: node.data.back,
    }),
  },
};

class NodeMapper {
  public toDomain(record: AnyNodeRecord): AnyNode {
    if (this.isNoteRecord(record)) {
      return mappers.note.toDomain(record);
    }
    if (this.isLinkRecord(record)) {
      return mappers.link.toDomain(record);
    }
    if (this.isTagRecord(record)) {
      return mappers.tag.toDomain(record);
    }
    if (this.isFlashcardRecord(record)) {
      return mappers.flashcard.toDomain(record);
    }

    const exhaustiveCheck: never = record;
    throw new Error(`Unknown node type: ${exhaustiveCheck}`);
  }

  public toRecords(node: AnyNode): {
    nodeRecord: NodeRecord;
    typeRecord:
      | NoteNodeRecord
      | LinkNodeRecord
      | TagNodeRecord
      | FlashcardNodeRecord;
  } {
    const nodeRecord: NodeRecord = {
      id: node.id,
      type: node.type,
      title: node.title,
      version: node.version,
      isPublic: node.isPublic,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };

    // We use a switch statement here purely for type-safe dispatch.
    // VS Code will now correctly infer the type of `typeRecord`.
    let typeRecord:
      | NoteNodeRecord
      | LinkNodeRecord
      | TagNodeRecord
      | FlashcardNodeRecord;

    switch (node.type) {
      case 'note':
        typeRecord = { nodeId: node.id, ...mappers.note.toTypeRecord(node) };
        break;
      case 'link':
        typeRecord = { nodeId: node.id, ...mappers.link.toTypeRecord(node) };
        break;
      case 'tag':
        typeRecord = { nodeId: node.id, ...mappers.tag.toTypeRecord(node) };
        break;
      case 'flashcard':
        typeRecord = {
          nodeId: node.id,
          ...mappers.flashcard.toTypeRecord(node),
        };
        break;
      default:
        // This ensures we handle all cases, satisfying TypeScript's exhaustiveness check.
        const exhaustiveCheck: never = node;
        throw new Error(`Unhandled node type: ${exhaustiveCheck}`);
    }

    return { nodeRecord, typeRecord };
  }

  private isNoteRecord(record: AnyNodeRecord): record is NodeWithNoteRecord {
    return record.type === 'note';
  }

  private isLinkRecord(record: AnyNodeRecord): record is NodeWithLinkRecord {
    return record.type === 'link';
  }

  private isTagRecord(record: AnyNodeRecord): record is NodeWithTagRecord {
    return record.type === 'tag';
  }

  private isFlashcardRecord(
    record: AnyNodeRecord
  ): record is NodeWithFlashcardRecord {
    return record.type === 'flashcard';
  }
}

export { NodeMapper };
