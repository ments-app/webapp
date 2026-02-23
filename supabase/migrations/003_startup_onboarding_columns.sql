-- Add new columns to startup_profiles for the 8-step onboarding form

ALTER TABLE public.startup_profiles
  ADD COLUMN IF NOT EXISTS business_model text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS key_strengths text,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS revenue_amount text,
  ADD COLUMN IF NOT EXISTS revenue_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS revenue_growth text,
  ADD COLUMN IF NOT EXISTS traction_metrics text,
  ADD COLUMN IF NOT EXISTS total_raised text,
  ADD COLUMN IF NOT EXISTS investor_count integer,
  ADD COLUMN IF NOT EXISTS elevator_pitch text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text;
