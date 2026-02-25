-- Migration: enforce single-choice poll integrity at the database level
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ────────────────────────────────────────────────────────────────
-- Step 2: Unique constraint — same user cannot vote same option twice
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_vote_user_option'
  ) THEN
    ALTER TABLE post_poll_votes
      ADD CONSTRAINT uq_vote_user_option UNIQUE (user_id, poll_option_id);
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- Step 3: Trigger — for single_choice polls, atomically remove any
--         existing vote before the new one is inserted
-- ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER is required in Supabase so the function runs as the
-- owner (bypassing RLS) and can delete the old vote row before the new INSERT.
CREATE OR REPLACE FUNCTION enforce_single_choice_vote()
RETURNS TRIGGER SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  v_poll_id   UUID;
  v_poll_type TEXT;
BEGIN
  -- Resolve the poll this option belongs to
  SELECT ppo.poll_id, pp.poll_type
  INTO v_poll_id, v_poll_type
  FROM post_poll_options ppo
  JOIN post_polls pp ON pp.id = ppo.poll_id
  WHERE ppo.id = NEW.poll_option_id;

  IF v_poll_type = 'single_choice' THEN
    -- Remove every existing vote by this user in the same poll
    DELETE FROM post_poll_votes
    WHERE user_id = NEW.user_id
      AND poll_option_id IN (
        SELECT id FROM post_poll_options WHERE poll_id = v_poll_id
      );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if it already exists from a previous attempt, then recreate
DROP TRIGGER IF EXISTS trg_enforce_single_choice ON post_poll_votes;

CREATE TRIGGER trg_enforce_single_choice
  BEFORE INSERT ON post_poll_votes
  FOR EACH ROW EXECUTE FUNCTION enforce_single_choice_vote();
