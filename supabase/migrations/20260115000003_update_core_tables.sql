-- Migration: Add UUID column and optimize core tables
-- Tables: users, accounts, leads, hash

-- ============================================
-- USERS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE users SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

-- Add index on account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);

-- Add index on hash_id
CREATE INDEX IF NOT EXISTS idx_users_hash_id ON users(hash_id);

-- Add updated_at trigger
SELECT add_updated_at_trigger('users');

-- ============================================
-- ACCOUNTS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE accounts ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE accounts SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE accounts ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_uuid ON accounts(uuid);

-- Add index on lead_id
CREATE INDEX IF NOT EXISTS idx_accounts_lead_id ON accounts(lead_id);

-- Add updated_at trigger
SELECT add_updated_at_trigger('accounts');

-- ============================================
-- LEADS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE leads ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE leads SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE leads ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_uuid ON leads(uuid);

-- Add index on hash_id
CREATE INDEX IF NOT EXISTS idx_leads_hash_id ON leads(hash_id);

-- Add updated_at trigger
SELECT add_updated_at_trigger('leads');

-- ============================================
-- HASH TABLE
-- ============================================

-- Hash table uses string id, no UUID needed
-- Add index on created_at
CREATE INDEX IF NOT EXISTS idx_hash_created_at ON hash(created_at);

-- Add updated_at trigger
SELECT add_updated_at_trigger('hash');

-- ============================================
-- INVITED_CONTACTS TABLE
-- ============================================

-- Add uuid column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invited_contacts' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE invited_contacts ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Populate existing rows with UUID
UPDATE invited_contacts SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL and UNIQUE
ALTER TABLE invited_contacts ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invited_contacts_uuid ON invited_contacts(uuid);

-- Add index on account_id
CREATE INDEX IF NOT EXISTS idx_invited_contacts_account_id ON invited_contacts(account_id);

-- Add updated_at trigger
SELECT add_updated_at_trigger('invited_contacts');
