-- 020_organizations_phase1.sql
-- Phase 1 organization support for incubators, accelerators, e-cells,
-- college incubators, facilitators, and similar support bodies.

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (
    org_type IN (
      'incubator',
      'accelerator',
      'ecell',
      'college_incubator',
      'facilitator',
      'venture_studio',
      'grant_body',
      'community',
      'other'
    )
  ),
  short_bio TEXT,
  description TEXT,
  website TEXT,
  contact_email TEXT,
  logo_url TEXT,
  banner_url TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  university_name TEXT,
  sectors TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  stage_focus TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  support_types TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON public.organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_published ON public.organizations(is_published);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'reviewer', 'editor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

CREATE TABLE IF NOT EXISTS public.organization_startup_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (
    relation_type IN ('incubated', 'accelerated', 'partnered', 'mentored', 'funded', 'community_member')
  ),
  status TEXT NOT NULL CHECK (
    status IN ('applied', 'accepted', 'active', 'alumni', 'rejected', 'withdrawn')
  ),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_startup_relations_unique UNIQUE (organization_id, startup_id)
);

CREATE INDEX IF NOT EXISTS idx_org_startup_relations_org_id
  ON public.organization_startup_relations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_startup_relations_startup_id
  ON public.organization_startup_relations(startup_id);
CREATE INDEX IF NOT EXISTS idx_org_startup_relations_status
  ON public.organization_startup_relations(status);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_startup_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select_policy ON public.organizations;
CREATE POLICY organizations_select_policy ON public.organizations
  FOR SELECT USING (
    is_published = true
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS organizations_insert_policy ON public.organizations;
CREATE POLICY organizations_insert_policy ON public.organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS organizations_update_policy ON public.organizations;
CREATE POLICY organizations_update_policy ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS organizations_delete_policy ON public.organizations;
CREATE POLICY organizations_delete_policy ON public.organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role = 'owner'
    )
  );

DROP POLICY IF EXISTS organization_members_select_policy ON public.organization_members;
CREATE POLICY organization_members_select_policy ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members self
      WHERE self.organization_id = organization_members.organization_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
    )
  );

DROP POLICY IF EXISTS organization_members_write_policy ON public.organization_members;
CREATE POLICY organization_members_write_policy ON public.organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members self
      WHERE self.organization_id = organization_members.organization_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members self
      WHERE self.organization_id = organization_members.organization_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS organization_relations_select_policy ON public.organization_startup_relations;
CREATE POLICY organization_relations_select_policy ON public.organization_startup_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.startup_profiles sp ON sp.id = organization_startup_relations.startup_id
      WHERE o.id = organization_startup_relations.organization_id
        AND (
          (
            o.is_published = true
            AND sp.is_published = true
            AND organization_startup_relations.status IN ('accepted', 'active', 'alumni')
          )
          OR EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.organization_id = organization_startup_relations.organization_id
              AND om.user_id = auth.uid()
              AND om.status = 'active'
          )
        )
    )
  );

DROP POLICY IF EXISTS organization_relations_write_policy ON public.organization_startup_relations;
CREATE POLICY organization_relations_write_policy ON public.organization_startup_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_startup_relations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'reviewer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_startup_relations.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'reviewer')
    )
  );
