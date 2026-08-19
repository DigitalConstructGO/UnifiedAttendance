CREATE TYPE "public"."notification_condition" AS ENUM('late', 'absent');--> statement-breakpoint
CREATE TABLE "notification_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condition" "notification_condition" NOT NULL,
	"threshold" integer NOT NULL,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_tiers_threshold_positive" CHECK ("notification_tiers"."threshold" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_tiers_condition_threshold_idx" ON "notification_tiers" USING btree ("condition","threshold");--> statement-breakpoint
-- Seed one starter tier per condition (threshold 1) so a fresh install has
-- something to match before anyone customizes it. Raw SQL with ON CONFLICT
-- DO NOTHING (against the unique (condition, threshold) index) rather than an
-- app-level seed script, because this data has a real uniqueness constraint
-- to conflict on and needs to exist the moment the table does — not only
-- when someone remembers to run a separate seed command.
INSERT INTO "notification_tiers" ("condition", "threshold", "subject_template", "body_template")
VALUES
	('late', 1, 'Attendance Notice', 'Hi {{employeeName}}, you were marked late on {{date}}.'),
	('absent', 1, 'Attendance Notice', 'Hi {{employeeName}}, you were marked absent on {{date}}.')
ON CONFLICT ("condition", "threshold") DO NOTHING;
