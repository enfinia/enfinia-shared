-- Migration: Create automatic updated_at trigger function
-- This function updates the updated_at column automatically on UPDATE

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically update updated_at column on row update';

-- Helper function to add updated_at trigger to a table
CREATE OR REPLACE FUNCTION add_updated_at_trigger(table_name text)
RETURNS void AS $$
DECLARE
  trigger_name text := 'trigger_' || table_name || '_updated_at';
BEGIN
  -- Drop existing trigger if exists
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);

  -- Create new trigger
  EXECUTE format('
    CREATE TRIGGER %I
    BEFORE UPDATE ON %I
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  ', trigger_name, table_name);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_updated_at_trigger(text) IS 'Add automatic updated_at trigger to a table';
