CREATE TABLE `competition_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_index` integer NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competition_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`order_index` integer NOT NULL,
	`name` text NOT NULL,
	`team_count` integer NOT NULL,
	`format_text` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'FUTURA' NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `registration_start` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `registration_end` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `season_start` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `season_end` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `prize_pool` integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `prize_currency` text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `prize_heading` text DEFAULT 'O topo não é dado.' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `prize_highlight` text DEFAULT 'É conquistado.' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `cta_title` text DEFAULT 'YOUR NAME COULD BE NEXT.' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `cta_button_text` text DEFAULT 'REGISTER YOUR TEAM' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `cta_button_link` text DEFAULT '/registration' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `published_at` integer;