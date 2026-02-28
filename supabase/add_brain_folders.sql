-- Add folder support to second_brain table
BEGIN;

-- Add folder_path column with default root folder
ALTER TABLE second_brain 
ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/';

-- Add title column for better note organization
ALTER TABLE second_brain
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing notes to have a title (extract from content)
UPDATE second_brain 
SET title = SUBSTRING(content FROM 1 FOR 50)
WHERE title IS NULL;

-- Create index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_second_brain_folder ON second_brain(folder_path);
CREATE INDEX IF NOT EXISTS idx_second_brain_title ON second_brain(title);

COMMIT;
