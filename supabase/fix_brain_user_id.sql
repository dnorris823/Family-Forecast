-- Rename user_id to created_by in second_brain table
BEGIN;

-- Rename the column
ALTER TABLE second_brain 
RENAME COLUMN user_id TO created_by;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notes or shared family notes" ON second_brain;
DROP POLICY IF EXISTS "Users can insert own notes" ON second_brain;
DROP POLICY IF EXISTS "Users can update own notes" ON second_brain;
DROP POLICY IF EXISTS "Users can delete own notes" ON second_brain;

-- Recreate policies with updated column name
CREATE POLICY "Users can view own notes or shared family notes"
  ON second_brain FOR SELECT
  USING ( 
    created_by = auth.uid() OR 
    (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()) AND is_shared = true)
  );

CREATE POLICY "Users can insert own notes"
  ON second_brain FOR INSERT
  WITH CHECK ( created_by = auth.uid() );

CREATE POLICY "Users can update own notes"
  ON second_brain FOR UPDATE
  USING ( created_by = auth.uid() );

CREATE POLICY "Users can delete own notes"
  ON second_brain FOR DELETE
  USING ( created_by = auth.uid() );

COMMIT;
