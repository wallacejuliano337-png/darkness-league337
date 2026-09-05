CREATE TABLE `published_standings` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`round_name` text NOT NULL,
	`team_id` text NOT NULL,
	`booyahs` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`placement_points` integer DEFAULT 0 NOT NULL,
	`penalty_points` integer DEFAULT 0 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`published_at` integer NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `competition_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `published_standings_stage_round_team_unique` ON `published_standings` (`stage_id`,`round_name`,`team_id`);--> statement-breakpoint
CREATE INDEX `published_standings_stage_round_idx` ON `published_standings` (`stage_id`,`round_name`);--> statement-breakpoint
DROP INDEX `match_results_stage_round_team_unique`;--> statement-breakpoint
ALTER TABLE `match_results` ADD `match_number` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `match_results_stage_round_match_team_unique` ON `match_results` (`stage_id`,`round_name`,`match_number`,`team_id`);--> statement-breakpoint
ALTER TABLE `competition_stages` ADD `match_count` integer DEFAULT 6 NOT NULL;