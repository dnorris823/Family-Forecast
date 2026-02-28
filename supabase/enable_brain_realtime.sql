-- Add second_brain to realtime publication
BEGIN;

-- Add second_brain to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE second_brain;

-- Set REPLICA IDENTITY FULL for second_brain
ALTER TABLE second_brain REPLICA IDENTITY FULL;

COMMIT;
