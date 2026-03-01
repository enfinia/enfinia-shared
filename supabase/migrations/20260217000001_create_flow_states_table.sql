-- Migration: Create flow_states table for bot-gateway flow persistence
CREATE TABLE IF NOT EXISTS flow_states (
  id BIGSERIAL PRIMARY KEY,
  flow_name TEXT NOT NULL,           -- e.g. 'initialGoalFlows', 'planningOfferFlows'
  contact_key TEXT NOT NULL,         -- contatoChave or message.from
  state JSONB NOT NULL DEFAULT '{}', -- the flow state object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one state per flow per contact
CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_states_flow_contact
  ON flow_states(flow_name, contact_key);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_flow_states_updated_at
  ON flow_states(updated_at);

-- Auto-update updated_at
SELECT add_updated_at_trigger('flow_states');
