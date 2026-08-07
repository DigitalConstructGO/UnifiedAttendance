-- A position can now belong to a department, so picking a department narrows
-- the positions on offer. Null keeps a position open to any department, which
-- is also what every existing position becomes.
ALTER TABLE "positions" ADD COLUMN "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
