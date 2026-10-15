CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`due_at` integer DEFAULT (unixepoch()) NOT NULL,
	`interval_raw` real DEFAULT 0 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cards_deck_id_due_at_idx` ON `cards` (`deck_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`reviewed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`grade` text NOT NULL,
	`due_at` integer NOT NULL,
	`interval_raw` real NOT NULL,
	`interval_days` integer NOT NULL,
	`ease_factor` real NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_card_id_reviewed_at_idx` ON `reviews` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `reviews_reviewed_at_idx` ON `reviews` (`reviewed_at`);
ALTER TABLE `cards` ADD `updated_at` integer;
CREATE TABLE `card_tags` (
	`card_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`card_id`, `tag_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_tags_tag_id_idx` ON `card_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `note_tags` (
	`note_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`note_id`, `tag_id`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_tags_tag_id_idx` ON `note_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`due_at` integer DEFAULT (unixepoch()) NOT NULL,
	`interval_raw` real DEFAULT 0 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cards`("id", "deck_id", "front", "back", "due_at", "interval_raw", "interval_days", "ease_factor", "reps", "lapses", "last_reviewed_at", "created_at", "updated_at") SELECT "id", "deck_id", "front", "back", "due_at", "interval_raw", "interval_days", "ease_factor", "reps", "lapses", "last_reviewed_at", "created_at", "updated_at" FROM `cards`;--> statement-breakpoint
DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `cards_deck_id_due_at_idx` ON `cards` (`deck_id`,`due_at`);--> statement-breakpoint
-- Decks become tags: "Spanish verbs" -> "spanish-verbs", and every card is
-- tagged with the deck it was in. The decks themselves are left in place.
INSERT OR IGNORE INTO `tags` (`name`, `created_at`)
SELECT lower(replace(trim(`name`), ' ', '-')), `created_at` FROM `decks`;--> statement-breakpoint
INSERT OR IGNORE INTO `card_tags` (`card_id`, `tag_id`)
SELECT `cards`.`id`, `tags`.`id`
FROM `cards`
JOIN `decks` ON `decks`.`id` = `cards`.`deck_id`
JOIN `tags` ON `tags`.`name` = lower(replace(trim(`decks`.`name`), ' ', '-'));
