DROP INDEX `tags_user_name_unique`;--> statement-breakpoint
ALTER TABLE `tags` ADD `parent_id` integer REFERENCES tags(id) ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_root_name_unique` ON `tags` (`user_id`,`name`) WHERE `parent_id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_parent_name_unique` ON `tags` (`user_id`,`parent_id`,`name`) WHERE `parent_id` IS NOT NULL;--> statement-breakpoint
CREATE INDEX `tags_parent_id_idx` ON `tags` (`parent_id`);
