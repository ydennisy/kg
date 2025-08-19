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

type NodeRecord = typeof nodesTable.$inferSelect;

export { nodesTable };
export type { NodeRecord };
