import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';
import {
  getProfileMaterialLinks,
  normalizeMaterialUrl,
  sanitizeProjectIds,
  sanitizeSelectedLinkKeys,
} from '@/lib/application-materials';

type UserRow = {
  id: string;
  username: string;
  linkedin?: string | null;
  social_links?: Record<string, string> | null;
};

async function getOwner(
  username: string,
): Promise<{ supabase: Awaited<ReturnType<typeof createAuthClient>>; userRow: UserRow; authUserId: string } | NextResponse> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRow, error } = await supabase
    .from('users')
    .select('id, username, linkedin, social_links')
    .eq('username', username)
    .maybeSingle();

  if (error || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.id !== userRow.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabase, userRow: userRow as UserRow, authUserId: user.id };
}

async function ensureResumeVariantOwnership(
  supabase: Awaited<ReturnType<typeof createAuthClient>>,
  userId: string,
  resumeVariantId: string | null,
) {
  if (!resumeVariantId) return null;

  const { data, error } = await supabase
    .from('resume_variants')
    .select('id, label, file_url, is_default')
    .eq('id', resumeVariantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Selected resume version was not found');
  }

  return data;
}

async function ensureProjectOwnership(
  supabase: Awaited<ReturnType<typeof createAuthClient>>,
  userId: string,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .in('id', projectIds);

  if (error) {
    throw new Error('Could not validate selected projects');
  }

  const validIds = new Set((data || []).map((item) => item.id as string));
  const missing = projectIds.filter((id) => !validIds.has(id));
  if (missing.length > 0) {
    throw new Error('One or more selected projects are invalid');
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const owner = await getOwner(username);
  if (owner instanceof NextResponse) return owner;

  const { supabase, userRow } = owner;

  const [resumeVariantsRes, applyKitsRes, projectsRes] = await Promise.all([
    supabase
      .from('resume_variants')
      .select('*')
      .eq('user_id', userRow.id)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('apply_kits')
      .select('*')
      .eq('user_id', userRow.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, tagline, logo_url')
      .eq('owner_id', userRow.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (resumeVariantsRes.error || applyKitsRes.error || projectsRes.error) {
    const message = resumeVariantsRes.error?.message
      || applyKitsRes.error?.message
      || projectsRes.error?.message
      || 'Failed to load materials';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      resume_variants: resumeVariantsRes.data || [],
      apply_kits: applyKitsRes.data || [],
      projects: projectsRes.data || [],
      profile_links: getProfileMaterialLinks(userRow.linkedin, userRow.social_links),
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const owner = await getOwner(username);
  if (owner instanceof NextResponse) return owner;

  const { supabase, userRow } = owner;
  const body = await req.json().catch(() => ({}));
  const kind = typeof body?.kind === 'string' ? body.kind : '';

  try {
    if (kind === 'resume_variant') {
      const id = typeof body?.id === 'string' ? body.id : null;
      const label = typeof body?.label === 'string' ? body.label.trim() : '';
      const fileUrl = normalizeMaterialUrl(body?.file_url);

      if (!label) {
        return NextResponse.json({ error: 'Resume label is required' }, { status: 400 });
      }

      if (!fileUrl) {
        return NextResponse.json({ error: 'Resume file URL is required' }, { status: 400 });
      }

      let isDefault = Boolean(body?.is_default);

      if (!id) {
        const { count } = await supabase
          .from('resume_variants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userRow.id);
        if ((count || 0) === 0) {
          isDefault = true;
        }
      }

      if (isDefault) {
        await supabase
          .from('resume_variants')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('user_id', userRow.id);
      }

      if (id) {
        const { data, error } = await supabase
          .from('resume_variants')
          .update({
            label,
            file_url: fileUrl,
            is_default: isDefault,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', userRow.id)
          .select('*')
          .single();

        if (error || !data) {
          return NextResponse.json({ error: error?.message || 'Failed to update resume version' }, { status: 500 });
        }

        return NextResponse.json({ data });
      }

      const { data, error } = await supabase
        .from('resume_variants')
        .insert({
          user_id: userRow.id,
          label,
          file_url: fileUrl,
          is_default: isDefault,
        })
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to create resume version' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    if (kind === 'apply_kit') {
      const id = typeof body?.id === 'string' ? body.id : null;
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
      const resumeVariantId = typeof body?.resume_variant_id === 'string' ? body.resume_variant_id : null;
      const highlightProjectIds = sanitizeProjectIds(body?.highlight_project_ids, 3);
      const selectedLinkKeys = sanitizeSelectedLinkKeys(body?.selected_link_keys);
      const includeProfileLinks = body?.include_profile_links !== false;
      let showOnProfile = Boolean(body?.show_on_profile);
      let isPrimary = Boolean(body?.is_primary);

      if (!name) {
        return NextResponse.json({ error: 'Kit name is required' }, { status: 400 });
      }

      if (isPrimary) {
        showOnProfile = true;
      }

      await ensureResumeVariantOwnership(supabase, userRow.id, resumeVariantId);
      await ensureProjectOwnership(supabase, userRow.id, highlightProjectIds);

      if (showOnProfile && !isPrimary) {
        const query = supabase
          .from('apply_kits')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userRow.id)
          .eq('show_on_profile', true);
        const { count } = id
          ? await query.neq('id', id)
          : await query;
        if ((count || 0) === 0) {
          isPrimary = true;
        }
      }

      if (isPrimary) {
        await supabase
          .from('apply_kits')
          .update({ is_primary: false, updated_at: new Date().toISOString() })
          .eq('user_id', userRow.id);
      }

      const payload = {
        name,
        summary: summary || null,
        resume_variant_id: resumeVariantId,
        highlight_project_ids: highlightProjectIds,
        selected_link_keys: includeProfileLinks ? selectedLinkKeys : [],
        include_profile_links: includeProfileLinks,
        show_on_profile: showOnProfile,
        is_primary: showOnProfile ? isPrimary : false,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data, error } = await supabase
          .from('apply_kits')
          .update(payload)
          .eq('id', id)
          .eq('user_id', userRow.id)
          .select('*')
          .single();

        if (error || !data) {
          return NextResponse.json({ error: error?.message || 'Failed to update apply kit' }, { status: 500 });
        }

        return NextResponse.json({ data });
      }

      const { data, error } = await supabase
        .from('apply_kits')
        .insert({
          user_id: userRow.id,
          ...payload,
        })
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to create apply kit' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unsupported material kind' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save material';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const owner = await getOwner(username);
  if (owner instanceof NextResponse) return owner;

  const { supabase, userRow } = owner;
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const id = searchParams.get('id');

  if (!kind || !id) {
    return NextResponse.json({ error: 'kind and id are required' }, { status: 400 });
  }

  if (kind === 'resume_variant') {
    const { data: existing } = await supabase
      .from('resume_variants')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', userRow.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Resume version not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('resume_variants')
      .delete()
      .eq('id', id)
      .eq('user_id', userRow.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.is_default) {
      const { data: nextDefault } = await supabase
        .from('resume_variants')
        .select('id')
        .eq('user_id', userRow.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nextDefault?.id) {
        await supabase
          .from('resume_variants')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('id', nextDefault.id)
          .eq('user_id', userRow.id);
      }
    }

    return NextResponse.json({ success: true });
  }

  if (kind === 'apply_kit') {
    const { error } = await supabase
      .from('apply_kits')
      .delete()
      .eq('id', id)
      .eq('user_id', userRow.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unsupported material kind' }, { status: 400 });
}
