CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`logo_url` text NOT NULL,
	`instagram_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
