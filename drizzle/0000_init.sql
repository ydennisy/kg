CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`type` text,
	`is_bidirectional` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `edges_from_idx` ON `edges` (`from_id`);--> statement-breakpoint
CREATE INDEX `edges_to_idx` ON `edges` (`to_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `edges_unique_idx_from_to_type` ON `edges` (`from_id`,`to_id`,`type`);--> statement-breakpoint
CREATE TABLE `flashcard_nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`due_at` text NOT NULL,
	`interval` integer NOT NULL,
	`ease_factor` real NOT NULL,
	`repetitions` integer NOT NULL,
	`last_reviewed_at` text,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `link_nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`crawled_title` text,
	`crawled_text` text,
	`crawled_html` text,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_nodes_url_unique` ON `link_nodes` (`url`);--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nodes_type_idx` ON `nodes` (`type`);--> statement-breakpoint
CREATE INDEX `nodes_is_public_idx` ON `nodes` (`is_public`);--> statement-breakpoint
CREATE TABLE `note_nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag_nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_nodes_name_unique` ON `tag_nodes` (`name`);