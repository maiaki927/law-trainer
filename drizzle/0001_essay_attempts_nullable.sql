-- 讓 attempts.is_correct 可為 NULL，用於申論題（無對錯）
-- SQLite 不支援 ALTER COLUMN，須重建 table

PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_json` text,
	`is_correct` integer,
	`time_spent_s` integer DEFAULT 0 NOT NULL,
	`attempted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attempts` (`id`,`user_id`,`question_id`,`answer_json`,`is_correct`,`time_spent_s`,`attempted_at`)
SELECT `id`,`user_id`,`question_id`,`answer_json`,`is_correct`,`time_spent_s`,`attempted_at` FROM `attempts`;
--> statement-breakpoint
DROP TABLE `attempts`;
--> statement-breakpoint
ALTER TABLE `__new_attempts` RENAME TO `attempts`;
--> statement-breakpoint
CREATE INDEX `attempts_user_correct_at_idx` ON `attempts` (`user_id`,`is_correct`,`attempted_at`);
--> statement-breakpoint
CREATE INDEX `attempts_user_question_idx` ON `attempts` (`user_id`,`question_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
