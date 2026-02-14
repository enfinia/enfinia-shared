-- Migration: Add UUID column and optimize financial tables
-- Tables: transactions, financial_baseline, financial_plan, balance

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE transactions ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE transactions SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE transactions ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transacted_at ON transactions(transacted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Composite index for account + date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
ON transactions(account_id, transacted_at DESC);

-- Composite index for categorization queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_category
ON transactions(account_id, category);

-- Add updated_at trigger
SELECT add_updated_at_trigger('transactions');

-- ============================================
-- FINANCIAL_BASELINE TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_baseline' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE financial_baseline ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE financial_baseline SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE financial_baseline ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_baseline_uuid ON financial_baseline(uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_financial_baseline_account_id ON financial_baseline(account_id);
CREATE INDEX IF NOT EXISTS idx_financial_baseline_user_id ON financial_baseline(user_id);

-- Composite index for baseline queries
CREATE INDEX IF NOT EXISTS idx_financial_baseline_account_category
ON financial_baseline(account_id, category);

-- Add updated_at trigger
SELECT add_updated_at_trigger('financial_baseline');

-- ============================================
-- FINANCIAL_PLAN TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_plan' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE financial_plan ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE financial_plan SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE financial_plan ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_plan_uuid ON financial_plan(uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_financial_plan_account_id ON financial_plan(account_id);
CREATE INDEX IF NOT EXISTS idx_financial_plan_created_at ON financial_plan(created_at DESC);

-- Add updated_at trigger
SELECT add_updated_at_trigger('financial_plan');

-- ============================================
-- BALANCE TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'balance' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE balance ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE balance SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE balance ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_uuid ON balance(uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_balance_account_id ON balance(account_id);

-- Composite index for monthly balance queries
CREATE INDEX IF NOT EXISTS idx_balance_account_month
ON balance(account_id, month_reference DESC);

-- Add updated_at trigger
SELECT add_updated_at_trigger('balance');
