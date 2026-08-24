ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_progress_range";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_completion_state";
ALTER TABLE "projects" ADD CONSTRAINT "projects_completion_state" CHECK (("projects"."status" = 'completed' and "projects"."completed_on" is not null) or ("projects"."status" <> 'completed' and "projects"."completed_on" is null));
ALTER TABLE "projects" DROP COLUMN IF EXISTS "progress_percent";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "budget_amount";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "currency";

ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_founded_year_valid";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_founded_calendar_pair";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "company_size_id";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "founded_year";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "founded_calendar";

ALTER TABLE "client_contacts" DROP CONSTRAINT IF EXISTS "client_contacts_reachable_channel";
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_reachable_channel" CHECK ("client_contacts"."status" <> 'active' or nullif(trim("client_contacts"."phone"), '') is not null or nullif(trim("client_contacts"."email"), '') is not null);
ALTER TABLE "client_contacts" DROP COLUMN IF EXISTS "middle_name";
ALTER TABLE "client_contacts" DROP COLUMN IF EXISTS "telegram_handle";

ALTER TABLE "crm_activities" DROP CONSTRAINT IF EXISTS "crm_activities_target_required";
ALTER TABLE "crm_activities" DROP CONSTRAINT IF EXISTS "crm_activities_summary_nonempty";
ALTER TABLE "crm_activities" RENAME COLUMN "summary" TO "note";
ALTER TABLE "crm_activities" RENAME COLUMN "occurred_at" TO "contact_date";
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_note_nonempty" CHECK (length(trim("note")) > 0);
ALTER TABLE "crm_activities" DROP COLUMN IF EXISTS "opportunity_id";
ALTER TABLE "crm_activities" DROP COLUMN IF EXISTS "activity_type";
ALTER TABLE "crm_activities" DROP COLUMN IF EXISTS "details";
ALTER TABLE "crm_activities" ALTER COLUMN "client_id" SET NOT NULL;

DROP TABLE IF EXISTS "company_sizes" CASCADE;
