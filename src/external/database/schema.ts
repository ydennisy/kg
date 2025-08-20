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
    isPublic: integer('is_public', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  },
  (t) => [
    index('nodes_type_idx').on(t.type),
    index('nodes_is_public_idx').on(t.isPublic),
  ]
);

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

// A node has many outgoing edges and many incoming edges
const nodesRelations = relations(nodesTable, ({ many }) => ({
  edgeSource: many(edgesTable, { relationName: 'edge_source' }),
  edgeTarget: many(edgesTable, { relationName: 'edge_target' }),
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

type NodeRecord = typeof nodesTable.$inferSelect;
type EdgeRecord = typeof edgesTable.$inferSelect;

export { nodesTable, edgesTable, nodesRelations, edgesRelations };
export type { NodeRecord, EdgeRecord };
