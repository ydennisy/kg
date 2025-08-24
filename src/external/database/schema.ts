import { relations } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from 'drizzle-orm/sqlite-core';

const nodesTable = sqliteTable(
  'nodes',
  {
    id: text('id').primaryKey(),
    type: text('type', {
      enum: ['note', 'link', 'tag', 'flashcard'],
    }).notNull(),
    title: text('title').notNull(),
    version: integer('version').notNull().default(1),
    isPublic: integer('is_public', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('nodes_type_idx').on(t.type),
    index('nodes_is_public_idx').on(t.isPublic),
  ]
);

const noteNodesTable = sqliteTable('note_nodes', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodesTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

const linkNodesTable = sqliteTable('link_nodes', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodesTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  crawledTitle: text('crawled_title'),
  crawledText: text('crawled_text'),
  crawledHtml: text('crawled_html'),
});

const tagNodesTable = sqliteTable('tag_nodes', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodesTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

const flashcardNodesTable = sqliteTable('flashcard_nodes', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodesTable.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
});

const edgesTable = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => nodesTable.id, {
        onDelete: 'cascade',
      }),
    targetId: text('target_id')
      .notNull()
      .references(() => nodesTable.id, {
        onDelete: 'cascade',
      }),
    type: text('type', {
      enum: [
        'references',
        'contains',
        'tagged_with',
        'similar_to',
        'responds_to',
      ],
    }),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    // Prevent duplicate edges of the same (source, target)
    unique('edges_unique_idx_source_target').on(t.sourceId, t.targetId),
    index('edges_source_idx').on(t.sourceId),
    index('edges_target_idx').on(t.targetId),
  ]
);

// Relations
const nodesRelations = relations(nodesTable, ({ one, many }) => ({
  noteNode: one(noteNodesTable, {
    fields: [nodesTable.id],
    references: [noteNodesTable.nodeId],
  }),
  linkNode: one(linkNodesTable, {
    fields: [nodesTable.id],
    references: [linkNodesTable.nodeId],
  }),
  tagNode: one(tagNodesTable, {
    fields: [nodesTable.id],
    references: [tagNodesTable.nodeId],
  }),
  flashcardNode: one(flashcardNodesTable, {
    fields: [nodesTable.id],
    references: [flashcardNodesTable.nodeId],
  }),
  edgeSource: many(edgesTable, { relationName: 'edge_source' }),
  edgeTarget: many(edgesTable, { relationName: 'edge_target' }),
}));

const noteNodesRelations = relations(noteNodesTable, ({ one }) => ({
  node: one(nodesTable, {
    fields: [noteNodesTable.nodeId],
    references: [nodesTable.id],
  }),
}));

const linkNodesRelations = relations(linkNodesTable, ({ one }) => ({
  node: one(nodesTable, {
    fields: [linkNodesTable.nodeId],
    references: [nodesTable.id],
  }),
}));

const tagNodesRelations = relations(tagNodesTable, ({ one }) => ({
  node: one(nodesTable, {
    fields: [tagNodesTable.nodeId],
    references: [nodesTable.id],
  }),
}));

const flashcardNodesRelations = relations(flashcardNodesTable, ({ one }) => ({
  node: one(nodesTable, {
    fields: [flashcardNodesTable.nodeId],
    references: [nodesTable.id],
  }),
}));

// An edge points to one source node and one target node
const edgesRelations = relations(edgesTable, ({ one }) => ({
  source: one(nodesTable, {
    fields: [edgesTable.sourceId],
    references: [nodesTable.id],
    relationName: 'edge_source',
  }),
  target: one(nodesTable, {
    fields: [edgesTable.targetId],
    references: [nodesTable.id],
    relationName: 'edge_target',
  }),
}));

// Type definitions
type NodeRecord = typeof nodesTable.$inferSelect;
type NoteNodeRecord = typeof noteNodesTable.$inferSelect;
type LinkNodeRecord = typeof linkNodesTable.$inferSelect;
type TagNodeRecord = typeof tagNodesTable.$inferSelect;
type FlashcardNodeRecord = typeof flashcardNodesTable.$inferSelect;
type EdgeRecord = typeof edgesTable.$inferSelect;

// Combined record types for joins
type NodeWithNoteRecord = NodeRecord & { noteNode: NoteNodeRecord };
type NodeWithLinkRecord = NodeRecord & { linkNode: LinkNodeRecord };
type NodeWithTagRecord = NodeRecord & { tagNode: TagNodeRecord };
type NodeWithFlashcardRecord = NodeRecord & {
  flashcardNode: FlashcardNodeRecord;
};

type AnyNodeRecord =
  | NodeWithNoteRecord
  | NodeWithLinkRecord
  | NodeWithTagRecord
  | NodeWithFlashcardRecord;

export {
  nodesTable,
  noteNodesTable,
  linkNodesTable,
  tagNodesTable,
  flashcardNodesTable,
  edgesTable,
  nodesRelations,
  noteNodesRelations,
  linkNodesRelations,
  tagNodesRelations,
  flashcardNodesRelations,
  edgesRelations,
};

export type {
  NodeRecord,
  NoteNodeRecord,
  LinkNodeRecord,
  TagNodeRecord,
  FlashcardNodeRecord,
  NodeWithNoteRecord,
  NodeWithLinkRecord,
  NodeWithTagRecord,
  NodeWithFlashcardRecord,
  AnyNodeRecord,
  EdgeRecord,
};
