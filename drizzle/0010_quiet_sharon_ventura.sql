DROP INDEX `match_results_stage_round_match_team_unique`;--> statement-breakpoint
DROP INDEX `results_stage_idx`;--> statement-breakpoint
ALTER TABLE `match_results` ADD `group_name` text DEFAULT 'SEM GRUPO' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `match_results_stage_round_group_match_team_unique` ON `match_results` (`stage_id`,`round_name`,`group_name`,`match_number`,`team_id`);--> statement-breakpoint
CREATE INDEX `results_stage_group_idx` ON `match_results` (`stage_id`,`round_name`,`group_name`);--> statement-breakpoint
DROP INDEX `published_standings_stage_round_team_unique`;--> statement-breakpoint
DROP INDEX `published_standings_stage_round_idx`;--> statement-breakpoint
ALTER TABLE `published_standings` ADD `group_name` text DEFAULT 'SEM GRUPO' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `published_standings_stage_round_group_team_unique` ON `published_standings` (`stage_id`,`round_name`,`group_name`,`team_id`);--> statement-breakpoint
CREATE INDEX `published_standings_stage_round_group_idx` ON `published_standings` (`stage_id`,`round_name`,`group_name`);--> statement-breakpoint
PRAGMA optimize;
