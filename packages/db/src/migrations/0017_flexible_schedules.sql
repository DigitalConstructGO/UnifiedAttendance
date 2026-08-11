-- Some people come as needed rather than on the branch's working days.
-- They carry no expected days, so silence is never read as absence.
ALTER TABLE "employees" ADD COLUMN "has_fixed_schedule" boolean DEFAULT true NOT NULL;
