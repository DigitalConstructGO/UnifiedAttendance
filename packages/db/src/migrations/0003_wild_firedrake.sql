ALTER TABLE "branches" ALTER COLUMN "timezone" SET DEFAULT 'Africa/Addis_Ababa';--> statement-breakpoint
UPDATE "branches" SET "timezone" = 'Africa/Addis_Ababa' WHERE "timezone" IS NULL;--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "timezone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_working_days" ADD CONSTRAINT "branch_working_days_within_one_day" CHECK ("branch_working_days"."opening_time" is null or "branch_working_days"."closing_time" is null or "branch_working_days"."closing_time" > "branch_working_days"."opening_time");