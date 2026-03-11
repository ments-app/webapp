import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ApplyPayload {
  full_name?: string;
  tagline?: string;
  about?: string;
  current_city?: string;
  skills?: string[];
  work_experiences?: {
    company_name: string;
    domain: string;
    positions: {
      position: string;
      start_date: string;
      end_date: string;
      description: string;
    }[];
  }[];
  education?: {
    institution_name: string;
    degree: string;
    field_of_study: string;
    start_date: string;
    end_date: string;
    description: string;
  }[];
  portfolio_links?: {
    platform: string;
    link: string;
  }[];
  side_projects?: {
    title: string;
    tagline: string;
    url: string;
    category: string;
  }[];
}

const VALID_PROJECT_CATEGORIES = new Set([
  'Web App',
  'Mobile App',
  'AI / ML',
  'Open Source Tool',
  'Game',
  'Design',
  'Data / Analytics',
  'API / Dev Tool',
  'Browser Extension',
  'Hardware',
  'Other',
]);

type UserSocialLinks = {
  github?: string;
  instagram?: string;
  dribbble?: string;
  behance?: string;
  youtube?: string;
  figma?: string;
  website?: string;
  substack?: string;
};

function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function inferPlatform(platform: string, url: string): keyof UserSocialLinks | 'linkedin' | null {
  const value = `${platform} ${url}`.toLowerCase();
  if (value.includes('linkedin')) return 'linkedin';
  if (value.includes('github')) return 'github';
  if (value.includes('instagram')) return 'instagram';
  if (value.includes('dribbble')) return 'dribbble';
  if (value.includes('behance')) return 'behance';
  if (value.includes('youtube') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('figma')) return 'figma';
  if (value.includes('substack')) return 'substack';
  if (value.includes('notion') || value.includes('portfolio') || value.includes('website') || value.includes('personal')) return 'website';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ApplyPayload = await req.json();
    const errors: string[] = [];
    const { data: existingUser } = await supabase
      .from('users')
      .select('linkedin, social_links')
      .eq('id', user.id)
      .maybeSingle();

    // 1. Update user profile fields
    const userUpdate: Record<string, unknown> = {};
    if (body.full_name) userUpdate.full_name = body.full_name;
    if (body.tagline) userUpdate.tagline = body.tagline;
    if (body.about) userUpdate.about = body.about;
    if (body.current_city) userUpdate.current_city = body.current_city;
    if (body.skills && body.skills.length > 0) userUpdate.skills = body.skills;

    if (body.portfolio_links && body.portfolio_links.length > 0) {
      const socialLinks: UserSocialLinks = { ...((existingUser?.social_links as UserSocialLinks | null) || {}) };
      let linkedin = typeof existingUser?.linkedin === 'string' ? existingUser.linkedin : null;

      for (const item of body.portfolio_links) {
        const normalized = normalizeUrl(item.link);
        if (!normalized) continue;
        const platform = inferPlatform(item.platform || '', normalized);
        if (!platform) continue;

        if (platform === 'linkedin') {
          linkedin = linkedin || normalized;
        } else if (!socialLinks[platform]) {
          socialLinks[platform] = normalized;
        }
      }

      if (linkedin) userUpdate.linkedin = linkedin;
      if (Object.keys(socialLinks).length > 0) userUpdate.social_links = socialLinks;
    }

    console.log('[resume/apply] userId:', user.id);
    console.log('[resume/apply] userUpdate fields:', Object.keys(userUpdate));
    console.log('[resume/apply] body keys:', Object.keys(body));

    if (Object.keys(userUpdate).length > 0) {
      // Use update (row guaranteed by trigger in migration 011)
      const { error } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', user.id);

      console.log('[resume/apply] user update result - error:', error);

      if (error) {
        // Row might not exist — fallback: fetch username then upsert
        console.log('[resume/apply] update failed, attempting upsert fallback. Error:', error.message);
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        const fallbackUsername = authUser?.user?.user_metadata?.name?.replaceAll(/\s+/g, '').toLowerCase()
          || user.email?.split('@')[0]
          || user.id.slice(0, 8);
        const { error: upsertErr } = await supabase
          .from('users')
          .upsert(
            { id: user.id, email: user.email, username: fallbackUsername, ...userUpdate },
            { onConflict: 'id' }
          );
        if (upsertErr) errors.push(`Profile upsert fallback: ${upsertErr.message}`);
      }
    }

    // 2. Insert work experiences
    if (body.work_experiences && body.work_experiences.length > 0) {
      for (let i = 0; i < body.work_experiences.length; i++) {
        const we = body.work_experiences[i];
        const { data: expData, error: expError } = await supabase
          .from('work_experiences')
          .insert({
            user_id: user.id,
            company_name: we.company_name,
            domain: we.domain || null,
            sort_order: i,
          })
          .select('id')
          .single();

        if (expError) {
          errors.push(`Work experience "${we.company_name}": ${expError.message}`);
          continue;
        }

        // Insert positions for this experience
        if (we.positions && we.positions.length > 0 && expData) {
          const positionsToInsert = we.positions
            .filter(p => p.position)
            .map((p, j) => ({
              experience_id: expData.id,
              position: p.position,
              start_date: p.start_date || '1900-01-01',
              end_date: p.end_date || null,
              description: p.description || null,
              sort_order: j,
            }));

          const { error: posError } = await supabase
            .from('positions')
            .insert(positionsToInsert);

          if (posError) {
            errors.push(`Positions for "${we.company_name}": ${posError.message}`);
          }
        }
      }
    }

    // 3. Insert education
    if (body.education && body.education.length > 0) {
      const educationToInsert = body.education.map((ed, i) => ({
        user_id: user.id,
        institution_name: ed.institution_name,
        degree: ed.degree || null,
        field_of_study: ed.field_of_study || null,
        start_date: ed.start_date || null,
        end_date: ed.end_date || null,
        description: ed.description || null,
        sort_order: i,
      }));

      const { error: edError } = await supabase
        .from('education')
        .insert(educationToInsert);

      if (edError) errors.push(`Education: ${edError.message}`);
    }

    // 4. Insert side projects into the profile projects system.
    if (body.side_projects && body.side_projects.length > 0) {
      const { data: existingProjects, error: existingProjectsError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('owner_id', user.id);

      if (existingProjectsError) {
        errors.push(`Existing projects lookup: ${existingProjectsError.message}`);
      } else {
        const seenTitles = new Set(
          (existingProjects || [])
            .map((project) => (project.title || '').trim().toLowerCase())
            .filter(Boolean)
        );
        const nextSortBase = existingProjects?.length || 0;

        const projectsToInsert = body.side_projects
          .map((project, index) => {
            const title = project.title?.trim();
            if (!title) return null;
            if (seenTitles.has(title.toLowerCase())) return null;

            seenTitles.add(title.toLowerCase());

            return {
              owner_id: user.id,
              title,
              tagline: project.tagline?.trim() || null,
              category: VALID_PROJECT_CATEGORIES.has(project.category) ? project.category : 'Other',
              visibility: 'public',
              sort_order: nextSortBase + index,
              source_url: normalizeUrl(project.url),
            };
          })
          .filter((project): project is NonNullable<typeof project> => project !== null);

        if (projectsToInsert.length > 0) {
          const projectRows = projectsToInsert.map((project) => ({
            owner_id: project.owner_id,
            title: project.title,
            tagline: project.tagline,
            category: project.category,
            visibility: project.visibility,
            sort_order: project.sort_order,
          }));
          const { data: insertedProjects, error: projectInsertError } = await supabase
            .from('projects')
            .insert(projectRows)
            .select('id, title');

          if (projectInsertError) errors.push(`Side projects: ${projectInsertError.message}`);
          if (!projectInsertError && insertedProjects) {
            const projectLinksToInsert = insertedProjects.flatMap((insertedProject) => {
              const matchingSource = projectsToInsert.find((project) => project.title === insertedProject.title);
              if (!matchingSource?.source_url) return [];
              return [{
                project_id: insertedProject.id,
                title: 'Project Link',
                url: matchingSource.source_url,
                icon_name: 'link',
                display_order: 0,
              }];
            });

            if (projectLinksToInsert.length > 0) {
              const { error: projectLinksError } = await supabase
                .from('project_links')
                .insert(projectLinksToInsert);

              if (projectLinksError) errors.push(`Project links: ${projectLinksError.message}`);
            }
          }
        }
      }
    }

    console.log('[resume/apply] total errors:', errors.length, errors);

    return NextResponse.json({
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Resume apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
