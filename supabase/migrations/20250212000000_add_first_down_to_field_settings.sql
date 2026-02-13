-- Add first_down (yard line for first down) to field_settings.
-- Default to 25 (midfield on a 50yd field) for existing rows.
ALTER TABLE field_settings
ADD COLUMN IF NOT EXISTS first_down integer DEFAULT 25;

COMMENT ON COLUMN field_settings.first_down IS 'Yard line for the first-down line (e.g. 25 for midfield on 50yd field).';
