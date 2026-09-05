CREATE TABLE `match_results` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`round_name` text NOT NULL,
	`team_id` text NOT NULL,
	`booyahs` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`placement_points` integer DEFAULT 0 NOT NULL,
	`penalty_points` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `competition_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_results_stage_round_team_unique` ON `match_results` (`stage_id`,`round_name`,`team_id`);--> statement-breakpoint
CREATE INDEX `results_stage_idx` ON `match_results` (`stage_id`,`round_name`);