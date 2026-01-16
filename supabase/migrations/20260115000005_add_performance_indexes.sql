-- Migration: Add additional performance indexes
-- Optimize common query patterns across all services

-- ============================================
-- AI DECISION EVENTS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_events' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE ai_decision_events ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

UPDATE ai_decision_events SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE ai_decision_events ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_decision_events_uuid ON ai_decision_events(uuid);

-- Performance indexes for export queries
CREATE INDEX IF NOT EXISTS idx_ai_decision_events_account_id ON ai_decision_events(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_events_created_at ON ai_decision_events(created_at DESC);

-- Composite index for export by account and date
CREATE INDEX IF NOT EXISTS idx_ai_decision_events_account_date
ON ai_decision_events(account_id, created_at DESC);

-- Add updated_at trigger if table has updated_at column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_events' AND column_name = 'updated_at'
  ) THEN
    PERFORM add_updated_at_trigger('ai_decision_events');
  END IF;
END $$;

-- ============================================
-- INTENTION TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intention' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE intention ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

UPDATE intention SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE intention ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_intention_uuid ON intention(uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_intention_account_id ON intention(account_id);
CREATE INDEX IF NOT EXISTS idx_intention_created_at ON intention(created_at DESC);

-- ============================================
-- FILE_IMPORTS TABLE
-- ============================================

-- Add uuid column if not exists (statement_layouts already uses UUID)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_imports' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE file_imports ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

UPDATE file_imports SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE file_imports ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_imports_uuid ON file_imports(uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_file_imports_account_id ON file_imports(account_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_file_hash ON file_imports(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_imports_status ON file_imports(status);

-- ============================================
-- CATEGORIES TABLE
-- ============================================

-- Categories table is reference data, optimize for reads
CREATE INDEX IF NOT EXISTS idx_categories_index ON categories(index);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ============================================
-- GENERAL PERFORMANCE SETTINGS
-- ============================================

-- Enable parallel query execution (if supported)
-- SET max_parallel_workers_per_gather = 2;

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE accounts;
ANALYZE leads;
ANALYZE transactions;
ANALYZE financial_baseline;
ANALYZE financial_plan;
ANALYZE balance;
