CREATE TABLE `task_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` integer NOT NULL,
	`group_id` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Populate task_groups with all task-group combinations (seed tasks for all groups)
INSERT INTO `task_groups` (`id`, `task_id`, `group_id`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	t.id,
	g.id,
	unixepoch()
FROM tasks t
CROSS JOIN groups g;
