CREATE TABLE `stage_finalizations` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`status` text DEFAULT 'FINALIZADA' NOT NULL,
	`qualified_limit` integer DEFAULT 48 NOT NULL,
	`finalized_at` integer NOT NULL,
	`finalized_by` text NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `competition_stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stage_finalizations_stage_id_unique` ON `stage_finalizations` (`stage_id`);--> statement-breakpoint
CREATE TABLE `stage_qualification_results` (
	`id` text PRIMARY KEY NOT NULL,
	`finalization_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`team_id` text NOT NULL,
	`final_position` integer NOT NULL,
	`qualification_status` text NOT NULL,
	`group_name` text,
	`booyahs` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`placement_points` integer DEFAULT 0 NOT NULL,
	`penalty_points` integer DEFAULT 0 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`finalization_id`) REFERENCES `stage_finalizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `competition_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stage_qualification_stage_team_unique` ON `stage_qualification_results` (`stage_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stage_qualification_stage_position_unique` ON `stage_qualification_results` (`stage_id`,`final_position`);--> statement-breakpoint
CREATE INDEX `stage_qualification_status_idx` ON `stage_qualification_results` (`stage_id`,`qualification_status`);