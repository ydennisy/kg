import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const GRADES = ['again', 'hard', 'good', 'easy'] as const;

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
    deckId: integer('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
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

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
