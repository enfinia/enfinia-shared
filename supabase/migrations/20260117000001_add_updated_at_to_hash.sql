-- Migration: Add updated_at and uuid columns to hash table
-- Fixes errors:
--   - "Could not find the 'updated_at' column of 'hash' in the schema cache"
--   - "Could not find the 'uuid' column of 'hash' in the schema cache"
--
-- The db-service automatically adds uuid and timestamps to all inserts,
-- but the hash table was missing these columns.

-- ============================================
-- 1. Add updated_at column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hash' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE hash ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill existing rows
UPDATE hash SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- Make updated_at NOT NULL
ALTER TABLE hash ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE hash ALTER COLUMN updated_at SET DEFAULT NOW();

-- Create trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on hash table
DROP TRIGGER IF EXISTS trigger_hash_updated_at ON hash;
CREATE TRIGGER trigger_hash_updated_at
  BEFORE UPDATE ON hash
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Add uuid column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hash' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE hash ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Backfill existing rows with UUID
UPDATE hash SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and add unique index
ALTER TABLE hash ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE hash ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_hash_uuid ON hash(uuid);
