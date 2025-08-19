import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

const nodesTable = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['note', 'link', 'tag', 'flashcard'] }).notNull(),
  title: text('title').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
});

const edgesTable = sqliteTable('edges', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => nodesTable.id),
  targetId: text('target_id')
    .notNull()
    .references(() => nodesTable.id),
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
});

type NodeRecord = typeof nodesTable.$inferSelect;
type EdgeRecord = typeof edgesTable.$inferSelect;

export { nodesTable, edgesTable };
export type { NodeRecord, EdgeRecord };
