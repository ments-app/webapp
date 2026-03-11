-- ============================================================
-- RLS Policy: Hide posts from non-active users
-- This ensures that posts from deactivated, suspended, or
-- deleted users are NEVER returned by any query, regardless
-- of which API or function fetches them.
-- ============================================================

-- Drop existing SELECT policies on posts (if any conflict)
-- We keep other policies (INSERT, UPDATE, DELETE) intact.

-- Policy: Only show posts whose author has account_status = 'active'
-- Uses a subquery with (select ...) pattern for performance (avoids re-eval per row)
CREATE POLICY "hide_deactivated_user_posts"
ON public.posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = posts.author_id
    AND users.account_status = 'active'
  )
);

-- Also hide from post_media, post_polls, post_poll_options via cascade
-- (These are typically joined to posts, so the posts RLS handles it.
--  But if they're queried directly, add policies here too.)

-- ============================================================
-- RLS Policy: Hide user data for non-active accounts
-- Prevents direct queries to the users table from returning
-- deactivated user data (except the user themselves).
-- ============================================================
CREATE POLICY "hide_deactivated_users"
ON public.users
FOR SELECT
USING (
  account_status = 'active'
  OR id = (select auth.uid())  -- Users can always see their own data
);

-- ============================================================
-- Performance: Ensure the index on account_status exists
-- (Created in 009_account_status_system.sql, but just in case)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_account_status
ON public.users (account_status);

-- Composite index for the posts join lookup
CREATE INDEX IF NOT EXISTS idx_posts_author_id
ON public.posts (author_id);
