CREATE TABLE `submission_reaction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `submission_reaction_events_submission_idx` ON `submission_reaction_events` (`submission_id`);--> statement-breakpoint
CREATE INDEX `submission_reaction_events_user_idx` ON `submission_reaction_events` (`user_id`);--> statement-breakpoint
CREATE TABLE `submission_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_reactions_submission_user_emoji_unique` ON `submission_reactions` (`submission_id`,`user_id`,`emoji`);--> statement-breakpoint
CREATE INDEX `submission_reactions_submission_idx` ON `submission_reactions` (`submission_id`);--> statement-breakpoint
CREATE INDEX `submission_reactions_user_idx` ON `submission_reactions` (`user_id`);