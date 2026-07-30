ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_conversion_pair";--> statement-breakpoint
ALTER TABLE "client_audit_entries" DROP CONSTRAINT "client_audit_entries_actor_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "client_audit_entries" ADD CONSTRAINT "client_audit_entries_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_conversion_pair" CHECK ("opportunities"."converted_at" is null or "opportunities"."client_id" is not null);