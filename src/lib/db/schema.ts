import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const GRADES = ['again', 'hard', 'good', 'easy'] as const;
export const NOTE_KINDS = ['note', 'link'] as const;

/**
 * Legacy grouping. Decks became tags in `add_notes_links_and_tags`, and nothing
 * new is filed under one; the table stays so old cards keep their history.
 */
export const decks = sqliteTable('decks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cards = sqliteTable(
  'cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    deckId: integer('deck_id').references(() => decks.id, {
      onDelete: 'cascade',
    }),
    front: text('front').notNull(),
    back: text('back').notNull(),
    // Current scheduling state. `interval_raw` is the unrounded interval the
    // scheduler multiplies; `interval_days` is what it rounds to for the due
    // date. Keeping both stops rounding error compounding review over review.
    dueAt: integer('due_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    intervalRaw: real('interval_raw').notNull().default(0),
    intervalDays: integer('interval_days').notNull().default(0),
    easeFactor: real('ease_factor').notNull().default(2.5),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    // When the front/back text was last edited — null until it is. Deliberately
    // not `$onUpdate`: grading a card writes to this row too, and a review is
    // not an edit. `updateCard` sets it by hand, and nothing else touches it.
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [index('cards_deck_id_due_at_idx').on(table.deckId, table.dueAt)],
);

/**
 * Append-only log: one row per answer, holding the grade and the state that
 * answer produced. Card rows only carry current state, so this is what makes
 * history — throughput, again-rate, how a card's interval moved — answerable.
 */
export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    grade: text('grade', { enum: GRADES }).notNull(),
    // State this review produced.
    dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
    intervalRaw: real('interval_raw').notNull(),
    intervalDays: integer('interval_days').notNull(),
    easeFactor: real('ease_factor').notNull(),
  },
  (table) => [
    index('reviews_card_id_reviewed_at_idx').on(table.cardId, table.reviewedAt),
    index('reviews_reviewed_at_idx').on(table.reviewedAt),
  ],
);

/**
 * Everything worth keeping that is not drilled: a `note` is a title and some
 * markdown, a `link` is a URL with an optional title and note. They share a
 * table because they share every column but `url`.
 */
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind', { enum: NOTE_KINDS }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  url: text('url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cardTags = sqliteTable(
  'card_tags',
  {
    cardId: integer('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.cardId, table.tagId] }),
    index('card_tags_tag_id_idx').on(table.tagId),
  ],
);

export const noteTags = sqliteTable(
  'note_tags',
  {
    noteId: integer('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.tagId] }),
    index('note_tags_tag_id_idx').on(table.tagId),
  ],
);

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type Tag = typeof tags.$inferSelect;
