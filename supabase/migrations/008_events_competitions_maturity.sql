-- ============================================================
-- Migration 008: Events & Competitions Maturity
-- ============================================================

-- ─── 1. Competitions — new columns ───────────────────────────

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS tags               text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS domain             text,
  ADD COLUMN IF NOT EXISTS organizer_name     text,
  ADD COLUMN IF NOT EXISTS participation_type text    NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS team_size_min      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS team_size_max      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS eligibility_criteria text;

ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_participation_type_check;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_participation_type_check
    CHECK (participation_type IN ('individual', 'team'));

-- ─── 2. Events — new columns ─────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS tags           text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organizer_name text;

-- Add category column if it does not already exist
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'event';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_category_check;

ALTER TABLE events
  ADD CONSTRAINT events_category_check
    CHECK (category IN ('event', 'meetup', 'workshop', 'conference', 'seminar'));

-- Backfill nulls just in case
UPDATE events SET category = 'event' WHERE category IS NULL OR category = '';

-- ─── 3. Competition Rounds ────────────────────────────────────

CREATE TABLE IF NOT EXISTS competition_rounds (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round_number   integer     NOT NULL DEFAULT 1,
  title          text        NOT NULL,
  description    text,
  start_date     timestamptz,
  end_date       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_rounds_competition_id
  ON competition_rounds(competition_id);

ALTER TABLE competition_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competition_rounds_public_read ON competition_rounds;
CREATE POLICY competition_rounds_public_read
  ON competition_rounds FOR SELECT USING (true);

DROP POLICY IF EXISTS competition_rounds_service_all ON competition_rounds;
CREATE POLICY competition_rounds_service_all
  ON competition_rounds FOR ALL USING (auth.role() = 'service_role');

-- ─── 4. Competition FAQs ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS competition_faqs (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid    NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  question       text    NOT NULL,
  answer         text    NOT NULL,
  order_index    integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competition_faqs_competition_id
  ON competition_faqs(competition_id);

ALTER TABLE competition_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competition_faqs_public_read ON competition_faqs;
CREATE POLICY competition_faqs_public_read
  ON competition_faqs FOR SELECT USING (true);

DROP POLICY IF EXISTS competition_faqs_service_all ON competition_faqs;
CREATE POLICY competition_faqs_service_all
  ON competition_faqs FOR ALL USING (auth.role() = 'service_role');

-- ─── 5. Saved Competitions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_competitions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id uuid        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  saved_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_competitions_user_id
  ON saved_competitions(user_id);

ALTER TABLE saved_competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_competitions_owner ON saved_competitions;
CREATE POLICY saved_competitions_owner
  ON saved_competitions FOR ALL USING (auth.uid() = user_id);

-- ─── 6. Saved Events ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_events (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_events_user_id
  ON saved_events(user_id);

ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_events_owner ON saved_events;
CREATE POLICY saved_events_owner
  ON saved_events FOR ALL USING (auth.uid() = user_id);

-- ─── 7. competition_entries — status + winner tracking ────────

ALTER TABLE competition_entries
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE competition_entries
  DROP CONSTRAINT IF EXISTS competition_entries_status_check;

ALTER TABLE competition_entries
  ADD CONSTRAINT competition_entries_status_check
    CHECK (status IN ('registered', 'shortlisted', 'winner', 'rejected'));
