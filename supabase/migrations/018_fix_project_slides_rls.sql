-- Fix missing WITH CHECK (true) on all FOR ALL policies.
-- In Postgres RLS, FOR ALL USING(true) only covers SELECT/UPDATE/DELETE row filtering.
-- INSERT requires WITH CHECK — without it the default is false (deny all inserts).

DROP POLICY IF EXISTS "Users can manage project_slides" ON public.project_slides;
CREATE POLICY "Users can manage project_slides" ON public.project_slides FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage project_text_sections" ON public.project_text_sections;
CREATE POLICY "Users can manage project_text_sections" ON public.project_text_sections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage project_links" ON public.project_links;
CREATE POLICY "Users can manage project_links" ON public.project_links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage positions" ON public.positions;
CREATE POLICY "Users can manage positions" ON public.positions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own conversation categories" ON public.conversation_categories;
CREATE POLICY "Users can manage own conversation categories" ON public.conversation_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage portfolio_platforms" ON public.portfolio_platforms;
CREATE POLICY "Users can manage portfolio_platforms" ON public.portfolio_platforms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage startup_founders" ON public.startup_founders;
CREATE POLICY "Users can manage startup_founders" ON public.startup_founders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage funding rounds" ON public.startup_funding_rounds;
CREATE POLICY "Users can manage funding rounds" ON public.startup_funding_rounds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage startup_incubators" ON public.startup_incubators;
CREATE POLICY "Users can manage startup_incubators" ON public.startup_incubators FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage startup_awards" ON public.startup_awards;
CREATE POLICY "Users can manage startup_awards" ON public.startup_awards FOR ALL USING (true) WITH CHECK (true);
