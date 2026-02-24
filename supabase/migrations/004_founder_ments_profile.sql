-- Add Ments profile linking and co-founder request flow to startup founders
ALTER TABLE public.startup_founders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ments_username text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'accepted'
    CHECK (status IN ('pending', 'accepted', 'declined'));

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_startup_founders_user_id ON public.startup_founders(user_id) WHERE user_id IS NOT NULL;

-- Index for finding pending requests for a user
CREATE INDEX IF NOT EXISTS idx_startup_founders_pending ON public.startup_founders(user_id, status) WHERE status = 'pending';
