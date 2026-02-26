-- Add avatar_url and role columns to startup_founders
ALTER TABLE public.startup_founders
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text;
