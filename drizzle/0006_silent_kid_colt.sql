ALTER TABLE `competition_settings` ADD `footer_logo_url` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `footer_symbol_url` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `footer_brand_text` text DEFAULT 'DARKNESS LEAGUE · LEAGUE FEM · SEASON 1' NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `show_instagram` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `instagram_url` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `show_discord` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `discord_url` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `show_whatsapp` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `whatsapp_number` text;--> statement-breakpoint
ALTER TABLE `competition_settings` ADD `whatsapp_message` text;