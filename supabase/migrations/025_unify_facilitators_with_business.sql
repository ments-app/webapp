-- 025_unify_facilitators_with_business.sql
-- Extend shared facilitator tables with app-facing profile fields and
-- non-destructively audit/migrate duplicate local organizations data.

ALTER TABLE public.facilitator_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS short_bio TEXT,
  ADD COLUMN IF NOT EXISTS public_description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS university_name TEXT,
  ADD COLUMN IF NOT EXISTS sectors TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS stage_focus TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS support_types TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_facilitator_profiles_slug
  ON public.facilitator_profiles(slug)
  WHERE slug IS NOT NULL;

ALTER TABLE public.startup_facilitator_assignments
  ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'supported';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'startup_facilitator_assignments_relation_type_check'
  ) THEN
    ALTER TABLE public.startup_facilitator_assignments
      ADD CONSTRAINT startup_facilitator_assignments_relation_type_check
      CHECK (relation_type IN (
        'supported',
        'incubated',
        'accelerated',
        'partnered',
        'mentored',
        'funded',
        'community_member'
      ));
  END IF;
END $$;

DO $$
DECLARE
  facilitator RECORD;
  candidate_slug TEXT;
  candidate_index INTEGER;
BEGIN
  FOR facilitator IN
    SELECT id, organisation_name
    FROM public.facilitator_profiles
    WHERE slug IS NULL
  LOOP
    candidate_slug := lower(trim(facilitator.organisation_name));
    candidate_slug := regexp_replace(candidate_slug, '[^a-z0-9]+', '-', 'g');
    candidate_slug := regexp_replace(candidate_slug, '(^-+|-+$)', '', 'g');

    IF candidate_slug IS NULL OR candidate_slug = '' THEN
      candidate_slug := 'facilitator';
    END IF;

    candidate_index := 1;
    WHILE EXISTS (
      SELECT 1
      FROM public.facilitator_profiles fp
      WHERE fp.slug = candidate_slug
        AND fp.id <> facilitator.id
    ) LOOP
      candidate_index := candidate_index + 1;
      candidate_slug := regexp_replace(lower(trim(facilitator.organisation_name)), '[^a-z0-9]+', '-', 'g');
      candidate_slug := regexp_replace(candidate_slug, '(^-+|-+$)', '', 'g');
      IF candidate_slug IS NULL OR candidate_slug = '' THEN
        candidate_slug := 'facilitator';
      END IF;
      candidate_slug := candidate_slug || '-' || candidate_index::TEXT;
    END LOOP;

    UPDATE public.facilitator_profiles
    SET slug = candidate_slug
    WHERE id = facilitator.id;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.facilitator_organization_migration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  organization_slug TEXT,
  matched_facilitator_id UUID,
  match_source TEXT,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_facilitator_org_audit_org
  ON public.facilitator_organization_migration_audit(organization_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
  ) THEN
    WITH matched_orgs AS (
      SELECT
        o.id AS organization_id,
        o.slug AS organization_slug,
        match_candidate.facilitator_id,
        match_candidate.match_source
      FROM public.organizations o
      LEFT JOIN LATERAL (
        SELECT candidate.facilitator_id, candidate.match_source
        FROM (
          SELECT ap.id AS facilitator_id, 'created_by'::TEXT AS match_source, 1 AS priority
          FROM public.admin_profiles ap
          WHERE ap.id = o.created_by
            AND ap.role = 'facilitator'

          UNION ALL

          SELECT ap.id AS facilitator_id, 'organization_member'::TEXT AS match_source, 2 AS priority
          FROM public.organization_members om
          JOIN public.admin_profiles ap ON ap.id = om.user_id
          WHERE om.organization_id = o.id
            AND om.status = 'active'
            AND ap.role = 'facilitator'
        ) AS candidate
        ORDER BY candidate.priority
        LIMIT 1
      ) AS match_candidate ON true
    )
    INSERT INTO public.facilitator_organization_migration_audit (
      organization_id,
      organization_slug,
      matched_facilitator_id,
      match_source,
      status,
      notes
    )
    SELECT
      mo.organization_id,
      mo.organization_slug,
      mo.facilitator_id,
      mo.match_source,
      CASE
        WHEN mo.facilitator_id IS NOT NULL THEN 'matched'
        ELSE 'unmatched'
      END,
      CASE
        WHEN mo.facilitator_id IS NOT NULL THEN 'Organization matched to facilitator profile for profile-data migration.'
        ELSE 'No facilitator admin profile could be matched automatically.'
      END
    FROM matched_orgs mo
    ON CONFLICT (organization_id) DO NOTHING;

    UPDATE public.facilitator_profiles fp
    SET
      slug = COALESCE(fp.slug, o.slug),
      short_bio = COALESCE(fp.short_bio, o.short_bio),
      public_description = COALESCE(fp.public_description, o.description),
      website = COALESCE(fp.website, o.website),
      logo_url = COALESCE(fp.logo_url, o.logo_url),
      banner_url = COALESCE(fp.banner_url, o.banner_url),
      city = COALESCE(fp.city, o.city),
      state = COALESCE(fp.state, o.state),
      country = COALESCE(fp.country, o.country),
      university_name = COALESCE(fp.university_name, o.university_name),
      sectors = CASE WHEN coalesce(array_length(fp.sectors, 1), 0) = 0 THEN o.sectors ELSE fp.sectors END,
      stage_focus = CASE WHEN coalesce(array_length(fp.stage_focus, 1), 0) = 0 THEN o.stage_focus ELSE fp.stage_focus END,
      support_types = CASE WHEN coalesce(array_length(fp.support_types, 1), 0) = 0 THEN o.support_types ELSE fp.support_types END,
      is_published = fp.is_published OR o.is_published,
      public_updated_at = COALESCE(fp.public_updated_at, o.updated_at)
    FROM public.organizations o
    JOIN public.facilitator_organization_migration_audit audit
      ON audit.organization_id = o.id
     AND audit.status = 'matched'
    WHERE fp.id = audit.matched_facilitator_id;

    INSERT INTO public.startup_facilitator_assignments (
      startup_id,
      facilitator_id,
      status,
      assigned_by,
      relation_type,
      notes,
      reviewed_at,
      created_at,
      updated_at
    )
    SELECT
      osr.startup_id,
      audit.matched_facilitator_id,
      CASE
        WHEN osr.status IN ('accepted', 'active', 'alumni') THEN 'approved'
        WHEN osr.status IN ('rejected', 'withdrawn') THEN 'rejected'
        ELSE 'pending'
      END,
      audit.matched_facilitator_id,
      COALESCE(osr.relation_type, 'supported'),
      CONCAT('Migrated from organizations relation ', o.slug),
      COALESCE(osr.responded_at, osr.updated_at),
      osr.created_at,
      osr.updated_at
    FROM public.organization_startup_relations osr
    JOIN public.organizations o ON o.id = osr.organization_id
    JOIN public.facilitator_organization_migration_audit audit
      ON audit.organization_id = o.id
     AND audit.status = 'matched'
    ON CONFLICT (startup_id, facilitator_id) DO NOTHING;
  END IF;
END $$;
