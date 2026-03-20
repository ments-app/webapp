-- Add brochure_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS brochure_url TEXT DEFAULT NULL;

-- Add brochure_url column to competitions table
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS brochure_url TEXT DEFAULT NULL;
