-- The client website is no longer captured or displayed anywhere in the product,
-- so the column goes with it.
--
-- This is destructive: any URL already stored is gone and cannot be recovered from
-- the schema. `if exists` only makes the statement replayable — it does not make the
-- data loss reversible.
ALTER TABLE "clients" DROP COLUMN IF EXISTS "website";
