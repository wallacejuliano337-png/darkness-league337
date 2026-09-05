CREATE TABLE `competition_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`min_starters` integer DEFAULT 4 NOT NULL,
	`max_starters` integer DEFAULT 4 NOT NULL,
	`max_reserves` integer DEFAULT 2 NOT NULL,
	`coach_required` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_coaches` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`full_name` text NOT NULL,
	`nickname` text NOT NULL,
	`country` text NOT NULL,
	`photo_url` text,
	`discord_type` text NOT NULL,
	`discord_value` text NOT NULL,
	`whatsapp` text,
	`freefire_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `players` ADD `discord_type` text DEFAULT 'numeric_id' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `discord_value` text;