CREATE TYPE "public"."manual_attendance_entry_kind" AS ENUM('check_in', 'check_out', 'mark_present', 'mark_absent');--> statement-breakpoint
CREATE TYPE "public"."workforce_document_kind" AS ENUM('profile_photo', 'national_id_front', 'national_id_back', 'workplace_id_front', 'workplace_id_back');--> statement-breakpoint
CREATE TABLE "employment_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "department_id" uuid,
  "position_id" uuid,
  "employment_type" "employment_type" DEFAULT 'permanent' NOT NULL,
  "status" "employee_status" DEFAULT 'active' NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "employment_periods_valid_range" CHECK ("employment_periods"."effective_to" is null or "employment_periods"."effective_to" >= "employment_periods"."effective_from")
);--> statement-breakpoint
CREATE TABLE "manual_attendance_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "kind" "manual_attendance_entry_kind" NOT NULL,
  "occurred_at" timestamp with time zone,
  "reason" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "manual_attendance_entries_time_required" CHECK ("manual_attendance_entries"."kind" not in ('check_in', 'check_out') or "manual_attendance_entries"."occurred_at" is not null)
);--> statement-breakpoint
CREATE TABLE "workforce_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "person_id" uuid,
  "cosigner_id" uuid,
  "kind" "workforce_document_kind" NOT NULL,
  "storage_key" text NOT NULL,
  "content_type" text NOT NULL,
  "content_length" integer NOT NULL,
  "finalized_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "workforce_documents_storage_key_unique" UNIQUE("storage_key"),
  CONSTRAINT "workforce_documents_one_owner" CHECK (("workforce_documents"."person_id" is not null and "workforce_documents"."cosigner_id" is null) or ("workforce_documents"."person_id" is null and "workforce_documents"."cosigner_id" is not null))
);--> statement-breakpoint
INSERT INTO "employment_periods" ("employee_id", "branch_id", "department_id", "position_id", "employment_type", "status", "effective_from")
SELECT "id", "branch_id", "department_id", "position_id", "employment_type", "status", "hire_date"
FROM "employees";--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_entries" ADD CONSTRAINT "manual_attendance_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_attendance_entries" ADD CONSTRAINT "manual_attendance_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_cosigner_id_cosigners_id_fk" FOREIGN KEY ("cosigner_id") REFERENCES "public"."cosigners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employment_periods_employee_dates_idx" ON "employment_periods" USING btree ("employee_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "employment_periods_branch_dates_idx" ON "employment_periods" USING btree ("branch_id","effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "employment_periods_open_employee_idx" ON "employment_periods" USING btree ("employee_id") WHERE "employment_periods"."effective_to" is null;--> statement-breakpoint
CREATE INDEX "manual_attendance_entries_employee_date_idx" ON "manual_attendance_entries" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "workforce_documents_person_idx" ON "workforce_documents" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "workforce_documents_cosigner_idx" ON "workforce_documents" USING btree ("cosigner_id");
