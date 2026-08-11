-- Roles become data: administrators create their own alongside the seeded
-- system roles, which carry a code and are protected from renaming.
ALTER TABLE "roles" ADD COLUMN "code" text;
ALTER TABLE "roles" ADD COLUMN "description" text;
ALTER TABLE "roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;
ALTER TABLE "roles" ADD COLUMN "archived_at" timestamp;
CREATE UNIQUE INDEX "roles_code_idx" ON "roles" ("code");
