CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` integer NOT NULL,
	`image_path` text NOT NULL,
	`ai_match` integer,
	`ai_confidence` real,
	`ai_reasoning` text,
	`valid` integer DEFAULT false,
	`submitted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL,
	`ai_prompt` text NOT NULL,
	`min_confidence` real DEFAULT 0.7 NOT NULL,
	`unlock_date` integer NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
