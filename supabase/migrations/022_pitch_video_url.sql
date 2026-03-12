-- Add pitch_video_url column to startup_profiles
ALTER TABLE public.startup_profiles
  ADD COLUMN IF NOT EXISTS pitch_video_url TEXT;
