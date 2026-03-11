-- Separate upvotes from bookmarks for startups.
-- Upvotes = public votes (count displayed on cards).
-- Bookmarks = private saves (user's personal collection).

CREATE TABLE IF NOT EXISTS public.startup_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, startup_id)
);

ALTER TABLE public.startup_upvotes ENABLE ROW LEVEL SECURITY;

-- Users can read all upvotes (needed to display counts)
DROP POLICY IF EXISTS "Anyone can read startup_upvotes" ON public.startup_upvotes;
CREATE POLICY "Anyone can read startup_upvotes" ON public.startup_upvotes FOR SELECT USING (true);

-- Users can only insert/delete their own upvotes
DROP POLICY IF EXISTS "Users can manage own startup_upvotes" ON public.startup_upvotes;
CREATE POLICY "Users can manage own startup_upvotes" ON public.startup_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own startup_upvotes" ON public.startup_upvotes;
CREATE POLICY "Users can delete own startup_upvotes" ON public.startup_upvotes FOR DELETE USING (auth.uid() = user_id);

-- Also make bookmarks readable only by the owner (private saves)
DROP POLICY IF EXISTS "Users can manage own startup_bookmarks" ON public.startup_bookmarks;
CREATE POLICY "Users can manage own startup_bookmarks" ON public.startup_bookmarks FOR ALL USING (auth.uid() = user_id);
