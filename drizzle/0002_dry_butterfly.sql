CREATE TABLE `dismissed_questions` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`dismissed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dismissed_user_idx` ON `dismissed_questions` (`user_id`);