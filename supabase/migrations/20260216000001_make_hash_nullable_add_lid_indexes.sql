-- Migration: Make hash column nullable and add indexes for LID/contact_key lookups
-- Purpose: Allow hash=null when only LID is available (no phone number)
-- Date: 2026-02-16

-- ============================================
-- HASH TABLE - Make hash column nullable
-- ============================================

-- Allow hash to be NULL for LID-only contacts (no phone number available)
ALTER TABLE hash ALTER COLUMN hash DROP NOT NULL;

-- ============================================
-- INDEXES for alternative lookup strategies
-- ============================================

-- Index on lid for direct LID lookups (Priority 2 when phone is unavailable)
CREATE INDEX IF NOT EXISTS idx_hash_lid ON hash(lid) WHERE lid IS NOT NULL;

-- Index on contact_key for fallback lookups (Priority 3 when neither phone nor LID available)
CREATE INDEX IF NOT EXISTS idx_hash_contact_key ON hash(contact_key) WHERE contact_key IS NOT NULL;
