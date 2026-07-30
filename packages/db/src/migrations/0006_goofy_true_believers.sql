ALTER TYPE "public"."workforce_document_kind" ADD VALUE 'employment_contract';--> statement-breakpoint
ALTER TABLE "workforce_documents" DROP CONSTRAINT "workforce_documents_one_owner";--> statement-breakpoint
ALTER TABLE "employment_contracts" ALTER COLUMN "cosigner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workforce_documents" ADD COLUMN "employment_contract_id" uuid;--> statement-breakpoint
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_employment_contract_id_employment_contracts_id_fk" FOREIGN KEY ("employment_contract_id") REFERENCES "public"."employment_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workforce_documents_contract_idx" ON "workforce_documents" USING btree ("employment_contract_id");--> statement-breakpoint
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_one_owner" CHECK (("workforce_documents"."person_id" is not null)::integer
        + ("workforce_documents"."cosigner_id" is not null)::integer
        + ("workforce_documents"."employment_contract_id" is not null)::integer = 1);