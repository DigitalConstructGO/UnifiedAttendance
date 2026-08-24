CREATE TABLE `attendance_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`type` text NOT NULL,
	`disputed_event_id` text,
	`proposed_time` integer,
	`reason` text NOT NULL,
	`applied_by` text NOT NULL,
	`applied_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`disputed_event_id`) REFERENCES `attendance_events`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`applied_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "attendance_corrections_time_required" CHECK("attendance_corrections"."type" not in ('add_check_in', 'add_check_out', 'adjust_check_in', 'adjust_check_out')
        or "attendance_corrections"."proposed_time" is not null)
);
--> statement-breakpoint
CREATE INDEX `attendance_corrections_employee_date_idx` ON `attendance_corrections` (`employee_id`,`attendance_date`);--> statement-breakpoint
CREATE TABLE `attendance_days` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`day_type` text NOT NULL,
	`outcome` text NOT NULL,
	`first_in` integer,
	`last_out` integer,
	`worked_minutes` integer,
	`late_minutes` integer,
	`early_departure_minutes` integer,
	`missing_check_in` integer DEFAULT false NOT NULL,
	`missing_check_out` integer DEFAULT false NOT NULL,
	`has_correction` integer DEFAULT false NOT NULL,
	`calculated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "attendance_days_out_after_in" CHECK("attendance_days"."last_out" is null or "attendance_days"."first_in" is null or "attendance_days"."last_out" >= "attendance_days"."first_in"),
	CONSTRAINT "attendance_days_non_negative_minutes" CHECK(("attendance_days"."worked_minutes" is null or "attendance_days"."worked_minutes" >= 0)
        and ("attendance_days"."late_minutes" is null or "attendance_days"."late_minutes" >= 0)
        and ("attendance_days"."early_departure_minutes" is null or "attendance_days"."early_departure_minutes" >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_days_employee_date_idx` ON `attendance_days` (`employee_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `attendance_days_date_outcome_idx` ON `attendance_days` (`attendance_date`,`outcome`);--> statement-breakpoint
CREATE TABLE `manual_attendance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`kind` text NOT NULL,
	`occurred_at` integer,
	`reason` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "manual_attendance_entries_time_required" CHECK("manual_attendance_entries"."kind" not in ('check_in', 'check_out') or "manual_attendance_entries"."occurred_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `manual_attendance_entries_employee_date_idx` ON `manual_attendance_entries` (`employee_id`,`attendance_date`);--> statement-breakpoint
CREATE TABLE `attendance_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`model` text,
	`serial_number` text NOT NULL,
	`ip_address` text,
	`firmware_version` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_devices_serial_number_unique` ON `attendance_devices` (`serial_number`);--> statement-breakpoint
CREATE INDEX `attendance_devices_branch_idx` ON `attendance_devices` (`branch_id`);--> statement-breakpoint
CREATE TABLE `attendance_push_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`device_serial_number` text NOT NULL,
	`device_id` text,
	`endpoint` text NOT NULL,
	`raw_body` text NOT NULL,
	`received_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`processed_at` integer,
	`event_count` integer,
	`parse_error` text,
	FOREIGN KEY (`device_id`) REFERENCES `attendance_devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attendance_push_batches_serial_received_idx` ON `attendance_push_batches` (`device_serial_number`,`received_at`);--> statement-breakpoint
CREATE INDEX `attendance_push_batches_unprocessed_idx` ON `attendance_push_batches` (`received_at`) WHERE "attendance_push_batches"."processed_at" is null;--> statement-breakpoint
CREATE TABLE `employee_device_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`device_identity_number` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "employee_device_identities_valid_range" CHECK("employee_device_identities"."valid_to" is null or "employee_device_identities"."valid_to" >= "employee_device_identities"."valid_from")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_device_identities_active_number_idx` ON `employee_device_identities` (`device_identity_number`) WHERE "employee_device_identities"."valid_to" is null;--> statement-breakpoint
CREATE INDEX `employee_device_identities_employee_idx` ON `employee_device_identities` (`employee_id`);--> statement-breakpoint
CREATE TABLE `attendance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`device_identity_number` text NOT NULL,
	`employee_id` text,
	`occurred_at` integer NOT NULL,
	`device_punch_state` text,
	`device_verify_mode` text,
	`direction` text DEFAULT 'unknown' NOT NULL,
	`raw_payload` text,
	`ingested_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `attendance_devices`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_events_device_identity_time_idx` ON `attendance_events` (`device_id`,`device_identity_number`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `attendance_events_employee_time_idx` ON `attendance_events` (`employee_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `attendance_events_unmatched_idx` ON `attendance_events` (`occurred_at`) WHERE "attendance_events"."employee_id" is null;--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `invoice_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` numeric NOT NULL,
	`currency` text NOT NULL,
	`paid_on` text NOT NULL,
	`method` text,
	`reference` text,
	`recorded_by_employee_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`invoice_id`) REFERENCES `invoices`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoice_payments_amount_positive" CHECK("invoice_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE INDEX `invoice_payments_invoice_date_idx` ON `invoice_payments` (`invoice_id`,`paid_on`);--> statement-breakpoint
CREATE INDEX `invoice_payments_organization_date_idx` ON `invoice_payments` (`organization_id`,`paid_on`);--> statement-breakpoint
CREATE INDEX `invoice_payments_recorder_idx` ON `invoice_payments` (`recorded_by_employee_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`project_id` text,
	`commercial_contract_id` text,
	`branch_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`issued_on` text,
	`due_on` text,
	`currency` text NOT NULL,
	`total_amount` numeric NOT NULL,
	`description` text,
	`note` text,
	`lifecycle_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`client_id`) REFERENCES `clients`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`client_id`,`project_id`) REFERENCES `projects`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`client_id`,`commercial_contract_id`) REFERENCES `commercial_contracts`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoices_total_positive" CHECK("invoices"."total_amount" > 0),
	CONSTRAINT "invoices_issued_dates" CHECK(("invoices"."lifecycle_status" = 'draft' and "invoices"."issued_on" is null and "invoices"."due_on" is null) or ("invoices"."lifecycle_status" <> 'draft' and "invoices"."issued_on" is not null and "invoices"."due_on" is not null and "invoices"."due_on" >= "invoices"."issued_on"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_organization_number_idx` ON `invoices` (`organization_id`,`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_organization_id_idx` ON `invoices` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_organization_client_id_idx` ON `invoices` (`organization_id`,`client_id`,`id`);--> statement-breakpoint
CREATE INDEX `invoices_client_idx` ON `invoices` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`project_id`);--> statement-breakpoint
CREATE INDEX `invoices_contract_idx` ON `invoices` (`commercial_contract_id`);--> statement-breakpoint
CREATE INDEX `invoices_branch_idx` ON `invoices` (`branch_id`);--> statement-breakpoint
CREATE INDEX `invoices_due_date_idx` ON `invoices` (`due_on`);--> statement-breakpoint
CREATE INDEX `invoices_lifecycle_status_idx` ON `invoices` (`organization_id`,`lifecycle_status`);--> statement-breakpoint
CREATE TABLE `commercial_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`opportunity_id` text,
	`contract_code` text NOT NULL,
	`service_name` text NOT NULL,
	`billing_cadence` text,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`renewal_mode` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`signed_on` text,
	`amount` numeric,
	`currency` text,
	`payment_structure` text DEFAULT 'full' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "commercial_contracts_valid_range" CHECK("commercial_contracts"."ends_on" > "commercial_contracts"."starts_on"),
	CONSTRAINT "commercial_contracts_signed_state" CHECK("commercial_contracts"."status" in ('draft', 'cancelled') or "commercial_contracts"."signed_on" is not null),
	CONSTRAINT "commercial_contracts_amount_currency_pair" CHECK(("commercial_contracts"."amount" is null and "commercial_contracts"."currency" is null) or ("commercial_contracts"."amount" is not null and "commercial_contracts"."currency" is not null)),
	CONSTRAINT "commercial_contracts_amount_nonnegative" CHECK("commercial_contracts"."amount" is null or "commercial_contracts"."amount" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commercial_contracts_organization_code_idx` ON `commercial_contracts` (`organization_id`,`contract_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `commercial_contracts_organization_client_id_idx` ON `commercial_contracts` (`organization_id`,`client_id`,`id`);--> statement-breakpoint
CREATE INDEX `commercial_contracts_client_idx` ON `commercial_contracts` (`client_id`);--> statement-breakpoint
CREATE INDEX `commercial_contracts_opportunity_idx` ON `commercial_contracts` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `commercial_contracts_status_idx` ON `commercial_contracts` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `client_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`commercial_contract_id` text,
	`opportunity_id` text,
	`project_id` text,
	`invoice_id` text,
	`logical_document_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`content_length` integer NOT NULL,
	`storage_key` text NOT NULL,
	`access_level` text DEFAULT 'standard' NOT NULL,
	`uploaded_by_employee_id` text NOT NULL,
	`uploaded_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`client_id`) REFERENCES `clients`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`client_id`,`commercial_contract_id`) REFERENCES `commercial_contracts`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`opportunity_id`) REFERENCES `opportunities`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`client_id`,`project_id`) REFERENCES `projects`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`client_id`,`invoice_id`) REFERENCES `invoices`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "client_documents_version_positive" CHECK("client_documents"."version" > 0),
	CONSTRAINT "client_documents_length_nonnegative" CHECK("client_documents"."content_length" >= 0),
	CONSTRAINT "client_documents_one_context" CHECK(("client_documents"."commercial_contract_id" is not null)
        + ("client_documents"."opportunity_id" is not null)
        + ("client_documents"."project_id" is not null)
        + ("client_documents"."invoice_id" is not null) <= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_documents_storage_key_idx` ON `client_documents` (`storage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `client_documents_logical_version_idx` ON `client_documents` (`logical_document_id`,`version`);--> statement-breakpoint
CREATE INDEX `client_documents_client_idx` ON `client_documents` (`client_id`);--> statement-breakpoint
CREATE INDEX `client_documents_contract_idx` ON `client_documents` (`commercial_contract_id`);--> statement-breakpoint
CREATE INDEX `client_documents_opportunity_idx` ON `client_documents` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `client_documents_project_idx` ON `client_documents` (`project_id`);--> statement-breakpoint
CREATE INDEX `client_documents_invoice_idx` ON `client_documents` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `client_audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`actor_type` text DEFAULT 'user' NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`change_summary` text,
	`occurred_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "client_audit_entries_actor_pair" CHECK(("client_audit_entries"."actor_type" = 'system' and "client_audit_entries"."actor_user_id" is null) or ("client_audit_entries"."actor_type" = 'user' and "client_audit_entries"."actor_user_id" is not null)),
	CONSTRAINT "client_audit_entries_action_nonempty" CHECK(length(trim("client_audit_entries"."action")) > 0)
);
--> statement-breakpoint
CREATE INDEX `client_audit_entries_client_date_idx` ON `client_audit_entries` (`client_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `client_audit_entries_entity_idx` ON `client_audit_entries` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `client_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`author_employee_id` text NOT NULL,
	`body` text NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`author_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "client_notes_body_nonempty" CHECK(length(trim("client_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE INDEX `client_notes_client_created_idx` ON `client_notes` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `client_notes_author_idx` ON `client_notes` (`author_employee_id`);--> statement-breakpoint
CREATE TABLE `crm_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`client_contact_id` text,
	`actor_employee_id` text NOT NULL,
	`note` text NOT NULL,
	`contact_date` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`client_contact_id`) REFERENCES `client_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "crm_activities_note_nonempty" CHECK(length(trim("crm_activities"."note")) > 0)
);
--> statement-breakpoint
CREATE INDEX `crm_activities_client_date_idx` ON `crm_activities` (`client_id`,`contact_date`);--> statement-breakpoint
CREATE INDEX `crm_activities_actor_idx` ON `crm_activities` (`actor_employee_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`commercial_contract_id` text,
	`name` text NOT NULL,
	`manager_employee_id` text NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`starts_on` text,
	`due_on` text NOT NULL,
	`completed_on` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`commercial_contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`manager_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`client_id`,`commercial_contract_id`) REFERENCES `commercial_contracts`(`organization_id`,`client_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "projects_date_range" CHECK("projects"."starts_on" is null or "projects"."due_on" >= "projects"."starts_on"),
	CONSTRAINT "projects_completion_state" CHECK(("projects"."status" = 'completed' and "projects"."completed_on" is not null) or ("projects"."status" <> 'completed' and "projects"."completed_on" is null))
);
--> statement-breakpoint
CREATE INDEX `projects_client_status_idx` ON `projects` (`client_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_organization_client_id_idx` ON `projects` (`organization_id`,`client_id`,`id`);--> statement-breakpoint
CREATE INDEX `projects_branch_idx` ON `projects` (`branch_id`);--> statement-breakpoint
CREATE INDEX `projects_manager_idx` ON `projects` (`manager_employee_id`);--> statement-breakpoint
CREATE INDEX `projects_contract_idx` ON `projects` (`commercial_contract_id`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`client_id` text,
	`name` text NOT NULL,
	`industry_id` text,
	`owner_employee_id` text NOT NULL,
	`pipeline_stage_id` text NOT NULL,
	`estimated_value` numeric,
	`currency` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`last_activity_at` integer,
	`converted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`closed_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`industry_id`) REFERENCES `industries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`pipeline_stage_id`) REFERENCES `pipeline_stages`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "opportunities_value_currency_pair" CHECK(("opportunities"."estimated_value" is null and "opportunities"."currency" is null) or ("opportunities"."estimated_value" is not null and "opportunities"."currency" is not null)),
	CONSTRAINT "opportunities_value_nonnegative" CHECK("opportunities"."estimated_value" is null or "opportunities"."estimated_value" >= 0),
	CONSTRAINT "opportunities_conversion_pair" CHECK("opportunities"."converted_at" is null or "opportunities"."client_id" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_organization_id_idx` ON `opportunities` (`organization_id`,`id`);--> statement-breakpoint
CREATE INDEX `opportunities_organization_idx` ON `opportunities` (`organization_id`);--> statement-breakpoint
CREATE INDEX `opportunities_branch_idx` ON `opportunities` (`branch_id`);--> statement-breakpoint
CREATE INDEX `opportunities_client_idx` ON `opportunities` (`client_id`);--> statement-breakpoint
CREATE INDEX `opportunities_owner_idx` ON `opportunities` (`owner_employee_id`);--> statement-breakpoint
CREATE INDEX `opportunities_stage_idx` ON `opportunities` (`pipeline_stage_id`);--> statement-breakpoint
CREATE INDEX `opportunities_last_activity_idx` ON `opportunities` (`last_activity_at`);--> statement-breakpoint
CREATE TABLE `opportunity_stage_transitions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`from_pipeline_stage_id` text,
	`to_pipeline_stage_id` text NOT NULL,
	`changed_by_user_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`from_pipeline_stage_id`) REFERENCES `pipeline_stages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_pipeline_stage_id`) REFERENCES `pipeline_stages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`changed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `opportunity_stage_transitions_opportunity_date_idx` ON `opportunity_stage_transitions` (`opportunity_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `opportunity_stage_transitions_target_idx` ON `opportunity_stage_transitions` (`to_pipeline_stage_id`);--> statement-breakpoint
CREATE TABLE `client_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`role` text,
	`phone` text,
	`email` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "client_contacts_reachable_channel" CHECK("client_contacts"."status" <> 'active' or nullif(trim("client_contacts"."phone"), '') is not null or nullif(trim("client_contacts"."email"), '') is not null)
);
--> statement-breakpoint
CREATE INDEX `client_contacts_client_idx` ON `client_contacts` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `client_contacts_primary_idx` ON `client_contacts` (`client_id`) WHERE "client_contacts"."status" = 'active' and "client_contacts"."is_primary" = true;--> statement-breakpoint
CREATE TABLE `client_owner_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` text NOT NULL,
	`owner_employee_id` text NOT NULL,
	`assigned_by_user_id` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "client_owner_assignments_valid_range" CHECK("client_owner_assignments"."effective_to" is null or "client_owner_assignments"."effective_to" >= "client_owner_assignments"."effective_from")
);
--> statement-breakpoint
CREATE INDEX `client_owner_assignments_client_dates_idx` ON `client_owner_assignments` (`client_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE INDEX `client_owner_assignments_owner_idx` ON `client_owner_assignments` (`owner_employee_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `client_owner_assignments_open_client_idx` ON `client_owner_assignments` (`client_id`) WHERE "client_owner_assignments"."effective_to" is null;--> statement-breakpoint
CREATE TABLE `client_types` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_types_organization_name_idx` ON `client_types` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `client_types_organization_status_idx` ON `client_types` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`owner_employee_id` text NOT NULL,
	`client_code` text NOT NULL,
	`legal_name` text NOT NULL,
	`trading_name` text,
	`industry_id` text NOT NULL,
	`client_type_id` text NOT NULL,
	`phone` text,
	`email` text,
	`tin` text,
	`vat_number` text,
	`registration_number` text,
	`business_license_number` text,
	`relationship_started_on` text NOT NULL,
	`priority` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`industry_id`) REFERENCES `industries`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`client_type_id`) REFERENCES `client_types`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "clients_archived_timestamp" CHECK("clients"."status" <> 'archived' or "clients"."archived_at" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_organization_code_idx` ON `clients` (`organization_id`,`client_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_organization_id_idx` ON `clients` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_organization_tin_idx` ON `clients` (`organization_id`,`tin`) WHERE "clients"."tin" is not null;--> statement-breakpoint
CREATE INDEX `clients_branch_idx` ON `clients` (`branch_id`);--> statement-breakpoint
CREATE INDEX `clients_owner_idx` ON `clients` (`owner_employee_id`);--> statement-breakpoint
CREATE INDEX `clients_industry_idx` ON `clients` (`industry_id`);--> statement-breakpoint
CREATE INDEX `clients_type_idx` ON `clients` (`client_type_id`);--> statement-breakpoint
CREATE INDEX `clients_status_idx` ON `clients` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `company_sizes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_sizes_organization_name_idx` ON `company_sizes` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `company_sizes_organization_status_idx` ON `company_sizes` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `industries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `industries_organization_name_idx` ON `industries` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `industries_organization_status_idx` ON `industries` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`outcome` text DEFAULT 'open' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pipeline_stages_positive_position" CHECK("pipeline_stages"."position" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_stages_organization_name_idx` ON `pipeline_stages` (`organization_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_stages_organization_position_idx` ON `pipeline_stages` (`organization_id`,`position`);--> statement-breakpoint
CREATE INDEX `pipeline_stages_organization_status_idx` ON `pipeline_stages` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`department_id` text,
	`position_id` text,
	`employee_code` text NOT NULL,
	`has_fixed_schedule` integer DEFAULT true NOT NULL,
	`employment_type` text DEFAULT 'permanent' NOT NULL,
	`hire_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_person_id_unique` ON `employees` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE INDEX `employees_branch_idx` ON `employees` (`branch_id`);--> statement-breakpoint
CREATE INDEX `employees_department_idx` ON `employees` (`department_id`);--> statement-breakpoint
CREATE TABLE `employment_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`department_id` text,
	`position_id` text,
	`employment_type` text DEFAULT 'permanent' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "employment_periods_valid_range" CHECK("employment_periods"."effective_to" is null or "employment_periods"."effective_to" >= "employment_periods"."effective_from")
);
--> statement-breakpoint
CREATE INDEX `employment_periods_employee_dates_idx` ON `employment_periods` (`employee_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE INDEX `employment_periods_branch_dates_idx` ON `employment_periods` (`branch_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE UNIQUE INDEX `employment_periods_open_employee_idx` ON `employment_periods` (`employee_id`) WHERE "employment_periods"."effective_to" is null;--> statement-breakpoint
CREATE TABLE `employment_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_number` text NOT NULL,
	`employee_id` text NOT NULL,
	`employment_period_id` text NOT NULL,
	`cosigner_id` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`signed_on` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`employment_period_id`) REFERENCES `employment_periods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cosigner_id`) REFERENCES `cosigners`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "employment_contracts_valid_range" CHECK("employment_contracts"."ends_on" is null or "employment_contracts"."ends_on" >= "employment_contracts"."starts_on"),
	CONSTRAINT "employment_contracts_signed_date" CHECK("employment_contracts"."status" not in ('signed', 'ended') or "employment_contracts"."signed_on" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employment_contracts_contract_number_unique` ON `employment_contracts` (`contract_number`);--> statement-breakpoint
CREATE INDEX `employment_contracts_employee_idx` ON `employment_contracts` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employment_contracts_period_idx` ON `employment_contracts` (`employment_period_id`);--> statement-breakpoint
CREATE INDEX `employment_contracts_cosigner_idx` ON `employment_contracts` (`cosigner_id`);--> statement-breakpoint
CREATE TABLE `workforce_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text,
	`cosigner_id` text,
	`employment_contract_id` text,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`content_type` text NOT NULL,
	`content_length` integer NOT NULL,
	`finalized_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cosigner_id`) REFERENCES `cosigners`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employment_contract_id`) REFERENCES `employment_contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workforce_documents_one_owner" CHECK(("workforce_documents"."person_id" is not null)
        + ("workforce_documents"."cosigner_id" is not null)
        + ("workforce_documents"."employment_contract_id" is not null) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workforce_documents_storage_key_unique` ON `workforce_documents` (`storage_key`);--> statement-breakpoint
CREATE INDEX `workforce_documents_person_idx` ON `workforce_documents` (`person_id`);--> statement-breakpoint
CREATE INDEX `workforce_documents_cosigner_idx` ON `workforce_documents` (`cosigner_id`);--> statement-breakpoint
CREATE INDEX `workforce_documents_contract_idx` ON `workforce_documents` (`employment_contract_id`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_code_unique` ON `permissions` (`code`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_active_idx` ON `roles` (`name`) WHERE "roles"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `roles_code_active_idx` ON `roles` (`code`) WHERE "roles"."archived_at" is null;--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`assigned_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`assigned_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `branch_working_days` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`is_working_day` integer DEFAULT true NOT NULL,
	`opening_time` text,
	`closing_time` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branch_working_days_within_one_day" CHECK("branch_working_days"."opening_time" is null or "branch_working_days"."closing_time" is null or "branch_working_days"."closing_time" > "branch_working_days"."opening_time")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branch_working_days_branch_weekday_idx` ON `branch_working_days` (`branch_id`,`weekday`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`timezone` text DEFAULT 'Africa/Addis_Ababa' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`grace_minutes` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branches_code_unique` ON `branches` (`code`);--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text,
	`name` text NOT NULL,
	`holiday_date` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `holidays_date_idx` ON `holidays` (`holiday_date`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`timezone` text DEFAULT 'Africa/Addis_Ababa' NOT NULL,
	`logo_url` text,
	`tin` text,
	`address` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_code_unique` ON `organizations` (`code`);--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`condition` text NOT NULL,
	`occurrence_count` integer NOT NULL,
	`tier_id` text,
	`sent_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `notification_tiers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_log_employee_date_condition_idx` ON `notification_log` (`employee_id`,`attendance_date`,`condition`);--> statement-breakpoint
CREATE TABLE `notification_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`condition` text NOT NULL,
	`threshold` integer NOT NULL,
	`subject_template` text NOT NULL,
	`body_template` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "notification_tiers_threshold_positive" CHECK("notification_tiers"."threshold" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_tiers_condition_threshold_idx` ON `notification_tiers` (`condition`,`threshold`);--> statement-breakpoint
CREATE TABLE `cosigners` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`workplace` text,
	`national_id_front_url` text,
	`national_id_back_url` text,
	`workplace_id_front_url` text,
	`workplace_id_back_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`phone` text,
	`email` text,
	`gender` text,
	`profile_photo_url` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
