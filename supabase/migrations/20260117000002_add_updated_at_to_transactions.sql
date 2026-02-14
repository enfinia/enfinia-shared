-- Migration: Add updated_at and uuid columns to transactions table
-- Fixes error:
--   - "Could not find the 'updated_at' column of 'transactions' in the schema cache"
--
-- The db-service automatically adds uuid and timestamps to all inserts,
-- but the transactions table was missing these columns.

-- ============================================
-- 1. Add updated_at column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill existing rows
UPDATE transactions SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- Make updated_at NOT NULL
ALTER TABLE transactions ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET DEFAULT NOW();

-- Create trigger (reuse function from previous migration)
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Add uuid column (if not exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE transactions ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Backfill existing rows with UUID
UPDATE transactions SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and add unique index
ALTER TABLE transactions ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);
