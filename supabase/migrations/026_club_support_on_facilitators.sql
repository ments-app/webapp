-- 026_club_support_on_facilitators.sql
-- Extend the pragmatic facilitator layer so clubs can reuse the same
-- profile and relation system as other organizations.

ALTER TABLE public.facilitator_profiles
  DROP CONSTRAINT IF EXISTS facilitator_profiles_organisation_type_check;

ALTER TABLE public.facilitator_profiles
  ADD CONSTRAINT facilitator_profiles_organisation_type_check
  CHECK (
    organisation_type IN (
      'ecell',
      'incubator',
      'accelerator',
      'college_cell',
      'club',
      'other'
    )
  );

ALTER TABLE public.startup_facilitator_assignments
  DROP CONSTRAINT IF EXISTS startup_facilitator_assignments_relation_type_check;

ALTER TABLE public.startup_facilitator_assignments
  ADD CONSTRAINT startup_facilitator_assignments_relation_type_check
  CHECK (
    relation_type IN (
      'supported',
      'incubated',
      'accelerated',
      'partnered',
      'mentored',
      'funded',
      'community_member',
      'club_project'
    )
  );

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_org_type_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_org_type_check
  CHECK (
    org_type IN (
      'incubator',
      'accelerator',
      'ecell',
      'college_incubator',
      'facilitator',
      'venture_studio',
      'grant_body',
      'community',
      'club',
      'other'
    )
  );

ALTER TABLE public.organization_startup_relations
  DROP CONSTRAINT IF EXISTS organization_startup_relations_relation_type_check;

ALTER TABLE public.organization_startup_relations
  ADD CONSTRAINT organization_startup_relations_relation_type_check
  CHECK (
    relation_type IN (
      'incubated',
      'accelerated',
      'partnered',
      'mentored',
      'funded',
      'community_member',
      'club_project'
    )
  );
