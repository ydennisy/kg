import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// const createdAt = text('created_at').default(sql`(CURRENT_TIMESTAMP)`);
// const updatedAt = text('updated_at').default(sql`(CURRENT_TIMESTAMP)`);

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
// type NodeCreateRecord = typeof nodesTable.$inferInsert;

export { nodesTable };
export type { NodeRecord };
