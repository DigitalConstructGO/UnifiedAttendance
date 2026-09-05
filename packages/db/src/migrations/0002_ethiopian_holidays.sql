ALTER TABLE `holidays` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `holidays` ADD `holiday_key` text;--> statement-breakpoint
ALTER TABLE `holidays` ADD `ethiopian_date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `holidays_key_uidx` ON `holidays` (`holiday_key`);