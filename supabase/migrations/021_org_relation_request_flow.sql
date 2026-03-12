-- 021_org_relation_request_flow.sql
-- Convert unilateral organization-startup linking into a request-and-accept flow.

ALTER TABLE public.organization_startup_relations
  ADD COLUMN IF NOT EXISTS requested_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

UPDATE public.organization_startup_relations
SET status = 'requested'
WHERE status = 'applied';

ALTER TABLE public.organization_startup_relations
  DROP CONSTRAINT IF EXISTS organization_startup_relations_status_check;

ALTER TABLE public.organization_startup_relations
  ADD CONSTRAINT organization_startup_relations_status_check
  CHECK (status IN ('requested', 'accepted', 'active', 'alumni', 'rejected', 'withdrawn'));

