CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`nickname` text NOT NULL,
	`full_name` text,
	`freefire_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`country` text NOT NULL,
	`role` text NOT NULL,
	`roster_type` text NOT NULL,
	`photo_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`tag` text NOT NULL,
	`country` text NOT NULL,
	`region` text NOT NULL,
	`group_name` text,
	`logo_url` text,
	`instagram` text,
	`discord` text,
	`status` text DEFAULT 'EM ANÁLISE' NOT NULL,
	`responsible_name` text NOT NULL,
	`responsible_nick` text,
	`responsible_email` text NOT NULL,
	`responsible_whatsapp` text,
	`responsible_discord` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_registration_id_unique` ON `teams` (`registration_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_slug_unique` ON `teams` (`slug`);