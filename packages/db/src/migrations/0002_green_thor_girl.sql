CREATE TYPE "public"."attendance_correction_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_correction_type" AS ENUM('add_check_in', 'add_check_out', 'adjust_check_in', 'adjust_check_out', 'mark_absent', 'mark_present', 'excuse_lateness');--> statement-breakpoint
CREATE TYPE "public"."attendance_day_type" AS ENUM('working_day', 'weekend', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."attendance_device_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."attendance_event_direction" AS ENUM('in', 'out', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."attendance_outcome" AS ENUM('present', 'partial', 'absent', 'unknown');--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"type" "attendance_correction_type" NOT NULL,
	"disputed_event_id" uuid,
	"proposed_time" timestamp with time zone,
	"reason" text NOT NULL,
	"status" "attendance_correction_status" DEFAULT 'pending' NOT NULL,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	CONSTRAINT "attendance_corrections_reviewed_when_decided" CHECK (("attendance_corrections"."status" = 'pending' and "attendance_corrections"."reviewed_by" is null and "attendance_corrections"."reviewed_at" is null)
        or ("attendance_corrections"."status" <> 'pending' and "attendance_corrections"."reviewed_by" is not null and "attendance_corrections"."reviewed_at" is not null)),
	CONSTRAINT "attendance_corrections_time_required" CHECK ("attendance_corrections"."type" not in ('add_check_in', 'add_check_out', 'adjust_check_in', 'adjust_check_out')
        or "attendance_corrections"."proposed_time" is not null)
);
--> statement-breakpoint
CREATE TABLE "attendance_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"model" text,
	"serial_number" text NOT NULL,
	"ip_address" text,
	"firmware_version" text,
	"status" "attendance_device_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "attendance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"device_identity_number" text NOT NULL,
	"employee_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"device_punch_state" text,
	"device_verify_mode" text,
	"direction" "attendance_event_direction" DEFAULT 'unknown' NOT NULL,
	"raw_payload" jsonb,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_push_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_serial_number" text NOT NULL,
	"device_id" uuid,
	"endpoint" text NOT NULL,
	"raw_body" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"event_count" integer,
	"parse_error" text
);
--> statement-breakpoint
CREATE TABLE "employee_device_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"device_identity_number" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_device_identities_valid_range" CHECK ("employee_device_identities"."valid_to" is null or "employee_device_identities"."valid_to" >= "employee_device_identities"."valid_from")
);
--> statement-breakpoint
DROP INDEX "attendance_days_date_status_idx";--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "user_roles" GROUP BY "user_id" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate user_roles: assign exactly one Role to each User before applying this migration';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_role_id_pk";--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "first_in" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "last_out" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "calculated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "calculated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_roles" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "day_type" "attendance_day_type";--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "outcome" "attendance_outcome";--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "worked_minutes" integer;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "late_minutes" integer;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "early_departure_minutes" integer;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "missing_check_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "missing_check_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "has_approved_correction" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "assigned_by" text;--> statement-breakpoint
UPDATE "attendance_days"
SET
  "day_type" = CASE "status"
    WHEN 'weekend' THEN 'weekend'::"attendance_day_type"
    WHEN 'holiday' THEN 'holiday'::"attendance_day_type"
    ELSE 'working_day'::"attendance_day_type"
  END,
  "outcome" = CASE "status"
    WHEN 'present' THEN 'present'::"attendance_outcome"
    WHEN 'late' THEN 'present'::"attendance_outcome"
    WHEN 'half_day' THEN 'partial'::"attendance_outcome"
    WHEN 'absent' THEN 'absent'::"attendance_outcome"
    ELSE 'unknown'::"attendance_outcome"
  END;--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "day_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_days" ALTER COLUMN "outcome" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_disputed_event_id_attendance_events_id_fk" FOREIGN KEY ("disputed_event_id") REFERENCES "public"."attendance_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_device_id_attendance_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_push_batches" ADD CONSTRAINT "attendance_push_batches_device_id_attendance_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_device_identities" ADD CONSTRAINT "employee_device_identities_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_corrections_employee_date_idx" ON "attendance_corrections" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections" USING btree ("status") WHERE "attendance_corrections"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "attendance_devices_branch_idx" ON "attendance_devices" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_events_device_identity_time_idx" ON "attendance_events" USING btree ("device_id","device_identity_number","occurred_at");--> statement-breakpoint
CREATE INDEX "attendance_events_employee_time_idx" ON "attendance_events" USING btree ("employee_id","occurred_at");--> statement-breakpoint
CREATE INDEX "attendance_events_unmatched_idx" ON "attendance_events" USING btree ("occurred_at") WHERE "attendance_events"."employee_id" is null;--> statement-breakpoint
CREATE INDEX "attendance_push_batches_serial_received_idx" ON "attendance_push_batches" USING btree ("device_serial_number","received_at");--> statement-breakpoint
CREATE INDEX "attendance_push_batches_unprocessed_idx" ON "attendance_push_batches" USING btree ("received_at") WHERE "attendance_push_batches"."processed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_device_identities_active_number_idx" ON "employee_device_identities" USING btree ("device_identity_number") WHERE "employee_device_identities"."valid_to" is null;--> statement-breakpoint
CREATE INDEX "employee_device_identities_employee_idx" ON "employee_device_identities" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_days_date_outcome_idx" ON "attendance_days" USING btree ("attendance_date","outcome");--> statement-breakpoint
ALTER TABLE "attendance_days" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_non_negative_minutes" CHECK (("attendance_days"."worked_minutes" is null or "attendance_days"."worked_minutes" >= 0)
        and ("attendance_days"."late_minutes" is null or "attendance_days"."late_minutes" >= 0)
        and ("attendance_days"."early_departure_minutes" is null or "attendance_days"."early_departure_minutes" >= 0));--> statement-breakpoint
DROP TYPE "public"."attendance_day_status";
