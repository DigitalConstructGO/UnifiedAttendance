ALTER TABLE "invoices" DROP CONSTRAINT "invoices_issued_dates";--> statement-breakpoint
ALTER TABLE "commercial_contracts" DROP CONSTRAINT "commercial_contracts_valid_range";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_completion_state";--> statement-breakpoint
ALTER TABLE "client_contacts" DROP CONSTRAINT "client_contacts_reachable_channel";--> statement-breakpoint
ALTER TABLE "invoice_payments" DROP CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_commercial_contract_id_commercial_contracts_id_fk";
--> statement-breakpoint
ALTER TABLE "client_documents" DROP CONSTRAINT "client_documents_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_documents" DROP CONSTRAINT "client_documents_commercial_contract_id_commercial_contracts_id_fk";
--> statement-breakpoint
ALTER TABLE "client_documents" DROP CONSTRAINT "client_documents_opportunity_id_opportunities_id_fk";
--> statement-breakpoint
ALTER TABLE "client_documents" DROP CONSTRAINT "client_documents_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "client_documents" DROP CONSTRAINT "client_documents_invoice_id_invoices_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_same_organization_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."invoices"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_same_organization_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_same_client_fk" FOREIGN KEY ("organization_id","client_id","project_id") REFERENCES "public"."projects"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_same_client_fk" FOREIGN KEY ("organization_id","client_id","commercial_contract_id") REFERENCES "public"."commercial_contracts"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_same_organization_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_contract_same_client_fk" FOREIGN KEY ("organization_id","client_id","commercial_contract_id") REFERENCES "public"."commercial_contracts"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_opportunity_same_organization_fk" FOREIGN KEY ("organization_id","opportunity_id") REFERENCES "public"."opportunities"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_project_same_client_fk" FOREIGN KEY ("organization_id","client_id","project_id") REFERENCES "public"."projects"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_invoice_same_client_fk" FOREIGN KEY ("organization_id","client_id","invoice_id") REFERENCES "public"."invoices"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contract_same_client_fk" FOREIGN KEY ("organization_id","client_id","commercial_contract_id") REFERENCES "public"."commercial_contracts"("organization_id","client_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organization_id_idx" ON "invoices" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organization_client_id_idx" ON "invoices" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_contracts_organization_client_id_idx" ON "commercial_contracts" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_organization_client_id_idx" ON "projects" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_organization_id_idx" ON "opportunities" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_id_idx" ON "clients" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_dates" CHECK (("invoices"."lifecycle_status" = 'draft' and "invoices"."issued_on" is null and "invoices"."due_on" is null) or ("invoices"."lifecycle_status" <> 'draft' and "invoices"."issued_on" is not null and "invoices"."due_on" is not null and "invoices"."due_on" >= "invoices"."issued_on"));--> statement-breakpoint
ALTER TABLE "commercial_contracts" ADD CONSTRAINT "commercial_contracts_valid_range" CHECK ("commercial_contracts"."ends_on" > "commercial_contracts"."starts_on");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_completion_state" CHECK (("projects"."status" = 'completed' and "projects"."progress_percent" = 100 and "projects"."completed_on" is not null) or ("projects"."status" <> 'completed' and "projects"."completed_on" is null));--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_reachable_channel" CHECK ("client_contacts"."status" <> 'active' or nullif(trim("client_contacts"."phone"), '') is not null or nullif(trim("client_contacts"."email"), '') is not null or nullif(trim("client_contacts"."telegram_handle"), '') is not null);