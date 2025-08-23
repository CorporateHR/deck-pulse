/*
  # Add email field to speakers table

  1. Changes
    - Add `email` column to `speakers` table
    - Make it optional (nullable) to maintain compatibility with existing records

  2. Security
    - No changes to existing RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'speakers' AND column_name = 'email'
  ) THEN
    ALTER TABLE speakers ADD COLUMN email text;
  END IF;
END $$;