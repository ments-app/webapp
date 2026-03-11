import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';

// GET /api/users/[username]/projects/[projectId]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string; projectId: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { username, projectId } = await params;
    if (!username || !projectId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, owner_id, title, category, tagline, cover_url, logo_url, visibility, created_at')
      .eq('id', projectId)
      .eq('owner_id', userRow.id)
      .maybeSingle();
    if (error) {
      console.warn('[project GET] error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ data: project });
  } catch (e) {
    console.error('[project GET] exception', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[username]/projects/[projectId]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ username: string; projectId: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { username, projectId } = await params;
    if (!username || !projectId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const { data: authData } = await supabase.auth.getUser();
    const authUserId = authData?.user?.id;
    if (!authUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { title, category, tagline, cover_url, logo_url, visibility } = body || {};
    const hasAny = [title, category, tagline, cover_url, logo_url, visibility].some((v) => typeof v !== 'undefined');
    if (!hasAny) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const normUrl = (u?: string | null) => {
      if (typeof u === 'undefined') return undefined;
      if (!u) return null;
      const t = String(u).trim();
      return t || null;
    };

    const visSet = new Set(['public', 'private', 'unlisted']);
    if (typeof title !== 'undefined' && String(title).trim().length === 0) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    }
    if (typeof category !== 'undefined' && (category === '' || category === null)) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }
    if (typeof visibility !== 'undefined' && !visSet.has(String(visibility))) {
      return NextResponse.json({ error: 'visibility must be one of public, private, unlisted' }, { status: 400 });
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (authUserId !== userRow.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const patch: Record<string, unknown> = {};
    if (typeof title !== 'undefined') patch.title = String(title ?? '').trim();
    if (typeof category !== 'undefined') patch.category = category;
    if (typeof tagline !== 'undefined') patch.tagline = (tagline === '' ? null : String(tagline));
    if (typeof cover_url !== 'undefined') patch.cover_url = normUrl(cover_url);
    if (typeof logo_url !== 'undefined') patch.logo_url = normUrl(logo_url);
    if (typeof visibility !== 'undefined') patch.visibility = visibility;

    const { data: updated, error: updErr } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .eq('owner_id', authUserId)
      .select('id, owner_id, title, category, tagline, cover_url, logo_url, visibility, created_at')
      .maybeSingle();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: 'Project not found or not owned by user' }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[project PUT] exception', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[username]/projects/[projectId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ username: string; projectId: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { username, projectId } = await params;
    if (!username || !projectId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const { data: authData } = await supabase.auth.getUser();
    const authUserId = authData?.user?.id;
    if (!authUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (authUserId !== userRow.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('owner_id', authUserId);
    if (deleteError) {
      console.warn('[project DELETE] error:', deleteError.message);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[project DELETE] exception', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
