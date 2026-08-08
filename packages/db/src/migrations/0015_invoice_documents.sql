-- Invoices become printable documents, so the organization carries the
-- identity a printed header needs and the invoice carries its line detail.
ALTER TABLE "organizations" ADD COLUMN "tin" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "note" text;
