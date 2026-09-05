CREATE TABLE `admin_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`admin_name` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`target_name` text,
	`details` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'MANAGER' NOT NULL,
	`status` text DEFAULT 'ATIVO' NOT NULL,
	`permissions` text NOT NULL,
	`last_login` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `competition_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competition_groups_name_unique` ON `competition_groups` (`name`);--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`section` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rules_section_unique` ON `rules` (`section`);--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `role` text DEFAULT 'OWNER' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `total_slots` integer DEFAULT 48 NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `group_limit` integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `season_name` text DEFAULT 'SEASON 1' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `competition_name` text DEFAULT 'DARKNESS LEAGUE' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `registrations_open` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `deleted_at` integer;