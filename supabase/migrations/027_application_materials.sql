-- Application materials: reusable resume variants and saved apply kits.

CREATE TABLE IF NOT EXISTS public.resume_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_variants_user_id ON public.resume_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_variants_user_default ON public.resume_variants(user_id, is_default);

ALTER TABLE public.resume_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for resume_variants" ON public.resume_variants;
CREATE POLICY "Public read for resume_variants"
  ON public.resume_variants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own resume_variants" ON public.resume_variants;
CREATE POLICY "Users can manage own resume_variants"
  ON public.resume_variants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.apply_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT,
  resume_variant_id UUID REFERENCES public.resume_variants(id) ON DELETE SET NULL,
  highlight_project_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  selected_link_keys TEXT[] NOT NULL DEFAULT '{}'::text[],
  include_profile_links BOOLEAN NOT NULL DEFAULT true,
  show_on_profile BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apply_kits_user_id ON public.apply_kits(user_id);

ALTER TABLE public.apply_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for apply_kits" ON public.apply_kits;
CREATE POLICY "Public read for apply_kits"
  ON public.apply_kits FOR SELECT
  USING (auth.uid() = user_id OR show_on_profile = true);

DROP POLICY IF EXISTS "Users can manage own apply_kits" ON public.apply_kits;
CREATE POLICY "Users can manage own apply_kits"
  ON public.apply_kits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
