CREATE TYPE "public"."employment_contract_status" AS ENUM('draft', 'signed', 'ended', 'cancelled');--> statement-breakpoint
CREATE TABLE "employment_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_period_id" uuid NOT NULL,
	"cosigner_id" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"status" "employment_contract_status" DEFAULT 'draft' NOT NULL,
	"signed_on" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employment_contracts_contract_number_unique" UNIQUE("contract_number"),
	CONSTRAINT "employment_contracts_valid_range" CHECK ("employment_contracts"."ends_on" is null or "employment_contracts"."ends_on" >= "employment_contracts"."starts_on"),
	CONSTRAINT "employment_contracts_signed_date" CHECK ("employment_contracts"."status" not in ('signed', 'ended') or "employment_contracts"."signed_on" is not null)
);
--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_cosigner_id_cosigners_id_fk";
--> statement-breakpoint
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_employment_period_id_employment_periods_id_fk" FOREIGN KEY ("employment_period_id") REFERENCES "public"."employment_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_cosigner_id_cosigners_id_fk" FOREIGN KEY ("cosigner_id") REFERENCES "public"."cosigners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "employment_contracts" (
	"contract_number",
	"employee_id",
	"employment_period_id",
	"cosigner_id",
	"starts_on",
	"status",
	"notes"
)
SELECT
	'LEGACY-' || "employees"."employee_code",
	"employees"."id",
	"employment_periods"."id",
	"people"."cosigner_id",
	"employment_periods"."effective_from",
	'draft',
	'Migrated from the legacy person-level cosigner assignment.'
FROM "people"
INNER JOIN "employees" ON "employees"."person_id" = "people"."id"
INNER JOIN "employment_periods" ON "employment_periods"."employee_id" = "employees"."id"
	AND "employment_periods"."effective_to" IS NULL
WHERE "people"."cosigner_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "employment_contracts_employee_idx" ON "employment_contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employment_contracts_period_idx" ON "employment_contracts" USING btree ("employment_period_id");--> statement-breakpoint
CREATE INDEX "employment_contracts_cosigner_idx" ON "employment_contracts" USING btree ("cosigner_id");--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "cosigner_id";
