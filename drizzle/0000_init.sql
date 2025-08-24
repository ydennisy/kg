CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`type` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `edges_source_idx` ON `edges` (`source_id`);--> statement-breakpoint
CREATE INDEX `edges_target_idx` ON `edges` (`target_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `edges_unique_idx_source_target` ON `edges` (`source_id`,`target_id`);--> statement-breakpoint
CREATE TABLE `flashcard_nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
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
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
