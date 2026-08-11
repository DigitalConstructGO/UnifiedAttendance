ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
DROP INDEX "roles_code_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_active_idx" ON "roles" ("name") WHERE "archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_code_active_idx" ON "roles" ("code") WHERE "archived_at" IS NULL;
