CREATE TYPE "public"."invoice_lifecycle_status" AS ENUM('draft', 'issued', 'void');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."client_document_access_level" AS ENUM('standard', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."client_document_kind" AS ENUM('contract', 'proposal', 'registration', 'nda', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."client_priority" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commercial_contract_status" AS ENUM('draft', 'active', 'expired', 'terminated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."contract_renewal_mode" AS ENUM('automatic', 'manual', 'none');--> statement-breakpoint
CREATE TYPE "public"."crm_activity_type" AS ENUM('call', 'meeting', 'email', 'site_visit');--> statement-breakpoint
CREATE TYPE "public"."founding_calendar" AS ENUM('gregorian', 'ethiopian');--> statement-breakpoint
CREATE TYPE "public"."opportunity_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage_outcome" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"paid_on" date NOT NULL,
	"method" text,
	"reference" text,
	"recorded_by_employee_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_payments_amount_positive" CHECK ("invoice_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"commercial_contract_id" uuid,
	"branch_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"issued_on" date,
	"due_on" date,
	"currency" text NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"lifecycle_status" "invoice_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_total_positive" CHECK ("invoices"."total_amount" > 0),
	CONSTRAINT "invoices_issued_dates" CHECK ("invoices"."lifecycle_status" = 'draft' or ("invoices"."issued_on" is not null and "invoices"."due_on" is not null and "invoices"."due_on" >= "invoices"."issued_on"))
);
--> statement-breakpoint
CREATE TABLE "commercial_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"contract_code" text NOT NULL,
	"service_name" text NOT NULL,
	"billing_cadence" text,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"renewal_mode" "contract_renewal_mode" DEFAULT 'none' NOT NULL,
	"status" "commercial_contract_status" DEFAULT 'draft' NOT NULL,
	"signed_on" date,
	"amount" numeric(14, 2),
	"currency" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_contracts_valid_range" CHECK ("commercial_contracts"."ends_on" >= "commercial_contracts"."starts_on"),
	CONSTRAINT "commercial_contracts_signed_state" CHECK ("commercial_contracts"."status" in ('draft', 'cancelled') or "commercial_contracts"."signed_on" is not null),
	CONSTRAINT "commercial_contracts_amount_currency_pair" CHECK (("commercial_contracts"."amount" is null and "commercial_contracts"."currency" is null) or ("commercial_contracts"."amount" is not null and "commercial_contracts"."currency" is not null)),
	CONSTRAINT "commercial_contracts_amount_nonnegative" CHECK ("commercial_contracts"."amount" is null or "commercial_contracts"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"commercial_contract_id" uuid,
	"opportunity_id" uuid,
	"project_id" uuid,
	"invoice_id" uuid,
	"logical_document_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"kind" "client_document_kind" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"content_length" integer NOT NULL,
	"storage_key" text NOT NULL,
	"access_level" "client_document_access_level" DEFAULT 'standard' NOT NULL,
	"uploaded_by_employee_id" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_documents_version_positive" CHECK ("client_documents"."version" > 0),
	CONSTRAINT "client_documents_length_nonnegative" CHECK ("client_documents"."content_length" >= 0),
	CONSTRAINT "client_documents_one_context" CHECK (("client_documents"."commercial_contract_id" is not null)::integer
        + ("client_documents"."opportunity_id" is not null)::integer
        + ("client_documents"."project_id" is not null)::integer
        + ("client_documents"."invoice_id" is not null)::integer <= 1)
);
--> statement-breakpoint
CREATE TABLE "client_audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"change_summary" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_audit_entries_actor_pair" CHECK (("client_audit_entries"."actor_type" = 'system' and "client_audit_entries"."actor_user_id" is null) or ("client_audit_entries"."actor_type" = 'user' and "client_audit_entries"."actor_user_id" is not null)),
	CONSTRAINT "client_audit_entries_action_nonempty" CHECK (length(trim("client_audit_entries"."action")) > 0)
);
--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"author_employee_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "client_notes_body_nonempty" CHECK (length(trim("client_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"opportunity_id" uuid,
	"client_contact_id" uuid,
	"actor_employee_id" uuid NOT NULL,
	"activity_type" "crm_activity_type" NOT NULL,
	"summary" text NOT NULL,
	"details" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_activities_target_required" CHECK (("crm_activities"."client_id" is not null)::integer + ("crm_activities"."opportunity_id" is not null)::integer >= 1),
	CONSTRAINT "crm_activities_summary_nonempty" CHECK (length(trim("crm_activities"."summary")) > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"commercial_contract_id" uuid,
	"name" text NOT NULL,
	"manager_employee_id" uuid NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"budget_amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"starts_on" date,
	"due_on" date NOT NULL,
	"completed_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_progress_range" CHECK ("projects"."progress_percent" between 0 and 100),
	CONSTRAINT "projects_date_range" CHECK ("projects"."starts_on" is null or "projects"."due_on" >= "projects"."starts_on"),
	CONSTRAINT "projects_completion_state" CHECK ("projects"."status" <> 'completed' or ("projects"."progress_percent" = 100 and "projects"."completed_on" is not null))
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"industry_id" uuid,
	"owner_employee_id" uuid NOT NULL,
	"pipeline_stage_id" uuid NOT NULL,
	"estimated_value" numeric(14, 2),
	"currency" text,
	"priority" "opportunity_priority" DEFAULT 'medium' NOT NULL,
	"last_activity_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "opportunities_value_currency_pair" CHECK (("opportunities"."estimated_value" is null and "opportunities"."currency" is null) or ("opportunities"."estimated_value" is not null and "opportunities"."currency" is not null)),
	CONSTRAINT "opportunities_value_nonnegative" CHECK ("opportunities"."estimated_value" is null or "opportunities"."estimated_value" >= 0),
	CONSTRAINT "opportunities_conversion_pair" CHECK (("opportunities"."client_id" is null and "opportunities"."converted_at" is null) or ("opportunities"."client_id" is not null and "opportunities"."converted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "opportunity_stage_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"from_pipeline_stage_id" uuid,
	"to_pipeline_stage_id" uuid NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"telegram_handle" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_contacts_reachable_channel" CHECK ("client_contacts"."status" <> 'active' or "client_contacts"."phone" is not null or "client_contacts"."email" is not null or "client_contacts"."telegram_handle" is not null)
);
--> statement-breakpoint
CREATE TABLE "client_owner_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"owner_employee_id" uuid NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_owner_assignments_valid_range" CHECK ("client_owner_assignments"."effective_to" is null or "client_owner_assignments"."effective_to" >= "client_owner_assignments"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "client_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"owner_employee_id" uuid NOT NULL,
	"client_code" text NOT NULL,
	"legal_name" text NOT NULL,
	"trading_name" text,
	"industry_id" uuid NOT NULL,
	"client_type_id" uuid NOT NULL,
	"company_size_id" uuid,
	"phone" text,
	"email" text,
	"tin" text,
	"vat_number" text,
	"registration_number" text,
	"business_license_number" text,
	"website" text,
	"founded_year" integer,
	"founded_calendar" "founding_calendar",
	"relationship_started_on" date NOT NULL,
	"priority" "client_priority",
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "clients_founded_year_valid" CHECK ("clients"."founded_year" is null or "clients"."founded_year" > 0),
	CONSTRAINT "clients_founded_calendar_pair" CHECK (("clients"."founded_year" is null and "clients"."founded_calendar" is null) or ("clients"."founded_year" is not null and "clients"."founded_calendar" is not null)),
	CONSTRAINT "clients_archived_timestamp" CHECK ("clients"."status" <> 'archived' or "clients"."archived_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "company_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"outcome" "pipeline_stage_outcome" DEFAULT 'open' NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stages_positive_position" CHECK ("pipeline_stages"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_recorded_by_employee_id_employees_id_fk" FOREIGN KEY ("recorded_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_commercial_contract_id_commercial_contracts_id_fk" FOREIGN KEY ("commercial_contract_id") REFERENCES "public"."commercial_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_contracts" ADD CONSTRAINT "commercial_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_contracts" ADD CONSTRAINT "commercial_contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_contracts" ADD CONSTRAINT "commercial_contracts_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_commercial_contract_id_commercial_contracts_id_fk" FOREIGN KEY ("commercial_contract_id") REFERENCES "public"."commercial_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_employee_id_employees_id_fk" FOREIGN KEY ("uploaded_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_audit_entries" ADD CONSTRAINT "client_audit_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_audit_entries" ADD CONSTRAINT "client_audit_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_audit_entries" ADD CONSTRAINT "client_audit_entries_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_author_employee_id_employees_id_fk" FOREIGN KEY ("author_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_commercial_contract_id_commercial_contracts_id_fk" FOREIGN KEY ("commercial_contract_id") REFERENCES "public"."commercial_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_employee_id_employees_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_transitions" ADD CONSTRAINT "opportunity_stage_transitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_transitions" ADD CONSTRAINT "opportunity_stage_transitions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_transitions" ADD CONSTRAINT "opportunity_stage_transitions_from_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("from_pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_transitions" ADD CONSTRAINT "opportunity_stage_transitions_to_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("to_pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_transitions" ADD CONSTRAINT "opportunity_stage_transitions_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_owner_assignments" ADD CONSTRAINT "client_owner_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_owner_assignments" ADD CONSTRAINT "client_owner_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_owner_assignments" ADD CONSTRAINT "client_owner_assignments_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_owner_assignments" ADD CONSTRAINT "client_owner_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_types" ADD CONSTRAINT "client_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_client_type_id_client_types_id_fk" FOREIGN KEY ("client_type_id") REFERENCES "public"."client_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_size_id_company_sizes_id_fk" FOREIGN KEY ("company_size_id") REFERENCES "public"."company_sizes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sizes" ADD CONSTRAINT "company_sizes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_date_idx" ON "invoice_payments" USING btree ("invoice_id","paid_on");--> statement-breakpoint
CREATE INDEX "invoice_payments_organization_date_idx" ON "invoice_payments" USING btree ("organization_id","paid_on");--> statement-breakpoint
CREATE INDEX "invoice_payments_recorder_idx" ON "invoice_payments" USING btree ("recorded_by_employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organization_number_idx" ON "invoices" USING btree ("organization_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_project_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_contract_idx" ON "invoices" USING btree ("commercial_contract_id");--> statement-breakpoint
CREATE INDEX "invoices_branch_idx" ON "invoices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_on");--> statement-breakpoint
CREATE INDEX "invoices_lifecycle_status_idx" ON "invoices" USING btree ("organization_id","lifecycle_status");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_contracts_organization_code_idx" ON "commercial_contracts" USING btree ("organization_id","contract_code");--> statement-breakpoint
CREATE INDEX "commercial_contracts_client_idx" ON "commercial_contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "commercial_contracts_opportunity_idx" ON "commercial_contracts" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "commercial_contracts_status_idx" ON "commercial_contracts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "client_documents_storage_key_idx" ON "client_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "client_documents_logical_version_idx" ON "client_documents" USING btree ("logical_document_id","version");--> statement-breakpoint
CREATE INDEX "client_documents_client_idx" ON "client_documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_documents_contract_idx" ON "client_documents" USING btree ("commercial_contract_id");--> statement-breakpoint
CREATE INDEX "client_documents_opportunity_idx" ON "client_documents" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "client_documents_project_idx" ON "client_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "client_documents_invoice_idx" ON "client_documents" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "client_audit_entries_client_date_idx" ON "client_audit_entries" USING btree ("client_id","occurred_at");--> statement-breakpoint
CREATE INDEX "client_audit_entries_entity_idx" ON "client_audit_entries" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "client_notes_client_created_idx" ON "client_notes" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "client_notes_author_idx" ON "client_notes" USING btree ("author_employee_id");--> statement-breakpoint
CREATE INDEX "crm_activities_client_date_idx" ON "crm_activities" USING btree ("client_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_opportunity_date_idx" ON "crm_activities" USING btree ("opportunity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_actor_idx" ON "crm_activities" USING btree ("actor_employee_id");--> statement-breakpoint
CREATE INDEX "projects_client_status_idx" ON "projects" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "projects_branch_idx" ON "projects" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "projects_manager_idx" ON "projects" USING btree ("manager_employee_id");--> statement-breakpoint
CREATE INDEX "projects_contract_idx" ON "projects" USING btree ("commercial_contract_id");--> statement-breakpoint
CREATE INDEX "opportunities_organization_idx" ON "opportunities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "opportunities_branch_idx" ON "opportunities" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "opportunities_client_idx" ON "opportunities" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "opportunities_owner_idx" ON "opportunities" USING btree ("owner_employee_id");--> statement-breakpoint
CREATE INDEX "opportunities_stage_idx" ON "opportunities" USING btree ("pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "opportunities_last_activity_idx" ON "opportunities" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "opportunity_stage_transitions_opportunity_date_idx" ON "opportunity_stage_transitions" USING btree ("opportunity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "opportunity_stage_transitions_target_idx" ON "opportunity_stage_transitions" USING btree ("to_pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "client_contacts_client_idx" ON "client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_contacts_primary_idx" ON "client_contacts" USING btree ("client_id") WHERE "client_contacts"."status" = 'active' and "client_contacts"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "client_owner_assignments_client_dates_idx" ON "client_owner_assignments" USING btree ("client_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "client_owner_assignments_owner_idx" ON "client_owner_assignments" USING btree ("owner_employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_owner_assignments_open_client_idx" ON "client_owner_assignments" USING btree ("client_id") WHERE "client_owner_assignments"."effective_to" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "client_types_organization_name_idx" ON "client_types" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "client_types_organization_status_idx" ON "client_types" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_code_idx" ON "clients" USING btree ("organization_id","client_code");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_tin_idx" ON "clients" USING btree ("organization_id","tin") WHERE "clients"."tin" is not null;--> statement-breakpoint
CREATE INDEX "clients_branch_idx" ON "clients" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "clients_owner_idx" ON "clients" USING btree ("owner_employee_id");--> statement-breakpoint
CREATE INDEX "clients_industry_idx" ON "clients" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "clients_type_idx" ON "clients" USING btree ("client_type_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_sizes_organization_name_idx" ON "company_sizes" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "company_sizes_organization_status_idx" ON "company_sizes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "industries_organization_name_idx" ON "industries" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "industries_organization_status_idx" ON "industries" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_organization_name_idx" ON "pipeline_stages" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_organization_position_idx" ON "pipeline_stages" USING btree ("organization_id","position");--> statement-breakpoint
CREATE INDEX "pipeline_stages_organization_status_idx" ON "pipeline_stages" USING btree ("organization_id","status");