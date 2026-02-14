-- Migration: Enable UUID generation functions
-- Required for UUID v4 generation in PostgreSQL

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to check if a value is a valid UUID
CREATE OR REPLACE FUNCTION is_valid_uuid(val text)
RETURNS boolean AS $$
BEGIN
  RETURN val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_valid_uuid(text) IS 'Check if a string is a valid UUID v4';
