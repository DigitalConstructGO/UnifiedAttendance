-- Deleting an employee is now a two-step act: archive first, then delete
-- for good from the archive. The timestamp is the archive membership.
ALTER TABLE "employees" ADD COLUMN "archived_at" timestamp;
