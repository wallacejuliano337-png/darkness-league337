CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`team_id` text NOT NULL,
	`submission_key` text NOT NULL,
	`status` text DEFAULT 'EM ANÁLISE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_registration_id_unique` ON `registrations` (`registration_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_team_id_unique` ON `registrations` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_submission_key_unique` ON `registrations` (`submission_key`);--> statement-breakpoint
CREATE TABLE `team_responsibles` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`full_name` text NOT NULL,
	`nickname` text,
	`email` text NOT NULL,
	`whatsapp` text,
	`discord` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_responsibles_team_id_unique` ON `team_responsibles` (`team_id`);--> statement-breakpoint
ALTER TABLE `team_coaches` ADD `instagram` text;