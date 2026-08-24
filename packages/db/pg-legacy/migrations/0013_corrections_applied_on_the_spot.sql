-- Corrections are applied the moment they are made, so the request/review
-- workflow leaves the schema entirely.
--
-- Rows that were never approved never touched an attendance day: a pending one
-- was still waiting and a rejected one was refused. Keeping them would turn
-- both into corrections that silently took effect, so they are removed rather
-- than carried over.
DELETE FROM "attendance_corrections" WHERE "status" <> 'approved';
--> statement-breakpoint
DROP INDEX IF EXISTS "attendance_corrections_status_idx";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP CONSTRAINT IF EXISTS "attendance_corrections_reviewed_when_decided";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP CONSTRAINT IF EXISTS "attendance_corrections_reviewed_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP COLUMN "status";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP COLUMN "review_note";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP COLUMN "reviewed_at";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" DROP COLUMN "reviewed_by";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."attendance_correction_status";
--> statement-breakpoint
-- The reviewer is gone, so "requested" no longer distinguishes anything.
ALTER TABLE "attendance_corrections" RENAME COLUMN "requested_by" TO "applied_by";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" RENAME COLUMN "requested_at" TO "applied_at";
--> statement-breakpoint
ALTER TABLE "attendance_corrections" RENAME CONSTRAINT "attendance_corrections_requested_by_user_id_fk" TO "attendance_corrections_applied_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_days" RENAME COLUMN "has_approved_correction" TO "has_correction";
