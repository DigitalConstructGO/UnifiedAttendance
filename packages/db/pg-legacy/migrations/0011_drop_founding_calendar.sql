-- The `founded_calendar` column was dropped in 0010, but its enum type outlived it
-- and no column has used it since. Dates are presented in one calendar now, so the
-- type has no future use either.
--
-- `if exists` keeps this replayable, and the absent `cascade` is deliberate: if some
-- column still depended on the type, this should fail loudly rather than drop it.
DROP TYPE IF EXISTS "public"."founding_calendar";
