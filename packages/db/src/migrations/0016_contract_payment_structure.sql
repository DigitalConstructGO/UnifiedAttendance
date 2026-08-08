-- A contract now states how its amount is settled: paid in full on
-- completion, prepaid entirely, or half up front.
CREATE TYPE "public"."contract_payment_structure" AS ENUM('full', 'prepaid', 'half_upfront');
--> statement-breakpoint
ALTER TABLE "commercial_contracts" ADD COLUMN "payment_structure" "contract_payment_structure" DEFAULT 'full' NOT NULL;
