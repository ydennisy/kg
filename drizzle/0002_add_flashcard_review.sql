ALTER TABLE `flashcard_nodes` ADD COLUMN `due_at` text NOT NULL DEFAULT (datetime('now'));
--> statement-breakpoint
ALTER TABLE `flashcard_nodes` ADD COLUMN `interval` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `flashcard_nodes` ADD COLUMN `ease_factor` real NOT NULL DEFAULT 2.5;
--> statement-breakpoint
ALTER TABLE `flashcard_nodes` ADD COLUMN `repetitions` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `flashcard_nodes` ADD COLUMN `last_reviewed_at` text;
