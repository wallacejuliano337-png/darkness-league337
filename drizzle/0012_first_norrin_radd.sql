CREATE TABLE `stage_group_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`team_id` text NOT NULL,
	`group_name` text NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `competition_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stage_group_assignment_stage_team_unique` ON `stage_group_assignments` (`stage_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `stage_group_assignment_stage_group_idx` ON `stage_group_assignments` (`stage_id`,`group_name`);