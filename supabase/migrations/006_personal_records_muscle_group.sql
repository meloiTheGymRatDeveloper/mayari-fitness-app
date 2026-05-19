-- Add muscle_group to personal_records so PRs can be grouped by category.
-- DEFAULT 'push' covers any rows that existed before this migration;
-- the app upsert now always supplies the correct value.
ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS muscle_group text NOT NULL DEFAULT 'push'
  CHECK (muscle_group IN ('push', 'pull', 'legs', 'core'));
