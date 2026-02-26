-- Add email column to startup_founders for non-Ments cofounders
ALTER TABLE public.startup_founders
  ADD COLUMN IF NOT EXISTS email text;
