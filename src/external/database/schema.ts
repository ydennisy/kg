import { relations } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from 'drizzle-orm/sqlite-core';
import { EDGE_TYPES } from '../../domain/edge-types.js';

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

const linkNodesTable = sqliteTable(
  'link_nodes',
  {
    nodeId: text('node_id')
      .primaryKey()
      .references(() => nodesTable.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    crawledTitle: text('crawled_title'),
    crawledText: text('crawled_text'),
    crawledHtml: text('crawled_html'),
  },
  (t) => [unique('link_nodes_url_unique').on(t.url)]
);

const tagNodesTable = sqliteTable(
  'tag_nodes',
  {
    nodeId: text('node_id')
      .primaryKey()
      .references(() => nodesTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
  },
  (t) => [unique('tag_nodes_name_unique').on(t.name)]
);

const flashcardNodesTable = sqliteTable('flashcard_nodes', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodesTable.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  dueAt: text('due_at').notNull(),
  interval: integer('interval').notNull(),
  easeFactor: real('ease_factor').notNull(),
  repetitions: integer('repetitions').notNull(),
  lastReviewedAt: text('last_reviewed_at'),
});

const edgesTable = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    fromId: text('from_id')
      .notNull()
      .references(() => nodesTable.id, {
        onDelete: 'cascade',
      }),
    toId: text('to_id')
      .notNull()
      .references(() => nodesTable.id, {
        onDelete: 'cascade',
      }),
    type: text('type', {
      enum: EDGE_TYPES,
    }),
    isBidirectional: integer('is_bidirectional', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    // Prevent duplicate edges of the same (from, to, type)
    unique('edges_unique_idx_from_to_type').on(t.fromId, t.toId, t.type),
    index('edges_from_idx').on(t.fromId),
    index('edges_to_idx').on(t.toId),
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
  from: many(edgesTable, { relationName: 'edge_from' }),
  to: many(edgesTable, { relationName: 'edge_to' }),
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
  from: one(nodesTable, {
    fields: [edgesTable.fromId],
    references: [nodesTable.id],
    relationName: 'edge_from',
  }),
  to: one(nodesTable, {
    fields: [edgesTable.toId],
    references: [nodesTable.id],
    relationName: 'edge_to',
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
