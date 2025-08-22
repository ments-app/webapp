import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize storage paths like "avatars/..." to absolute public URLs
function toPublicUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^s3:\/\//i.test(u)) return u; // let edge proxy handle s3 scheme
  return `${supabaseUrl}/storage/v1/object/public/${u.replace(/^\//, '')}`;
}

type UserRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_image: string | null;
  tagline: string | null;
  current_city: string | null;
  user_type: string | null;
  is_verified: boolean | null;
  about: string | null;
};

// GET /api/users/[username]/profile?viewerId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get('viewerId');
    const { username: rawUsername } = await params;
    const username = (rawUsername || '').trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // 1) Fetch user by username (exact, case-sensitive match as stored)
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, banner_image, tagline, current_city, user_type, is_verified, about')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      console.warn('[profile API] error fetching user:', userError.message);
    }

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Normalize user payload to expose `bio` expected by client
    const u = userRow as UserRow;
    const user = {
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      avatar_url: toPublicUrl(u.avatar_url),
      cover_url: toPublicUrl(u.banner_image) ?? null,
      tagline: u.tagline,
      current_city: u.current_city,
      user_type: u.user_type,
      is_verified: u.is_verified,
      bio: u.about ?? null,
    } as const;

    // 2) Followers/Following counts (graceful if table missing)
    let followers = 0;
    let following = 0;
    try {
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', user.id);

      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      followers = followersCount || 0;
      following = followingCount || 0;
    } catch {
      // Ignore missing table or permission errors; keep zeros
      followers = 0;
      following = 0;
    }

    // 3) Work experiences (optional list, limited)
    type ExperienceRow = {
      id: string;
      title?: string | null;
      role?: string | null;
      company?: string | null;
      company_name?: string | null;
      is_current?: boolean | null;
      start_date?: string | null;
      end_date?: string | null;
      description?: string | null;
      sort_order?: number | null;
    };
    let experiences: ExperienceRow[] = [];
    try {
      const { data } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(10);
      experiences = data || [];
    } catch {
      experiences = [];
    }

    // 4) Projects and portfolios (counts only here)
    let projectsCount = 0;
    let portfoliosCount = 0;
    try {
      const { count: pCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      projectsCount = pCount || 0;
    } catch {
      projectsCount = 0;
    }

    try {
      const { count: pfCount } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      portfoliosCount = pfCount || 0;
    } catch {
      portfoliosCount = 0;
    }

    // 5) Whether the viewer follows this user
    let is_following = false;
    if (viewerId && viewerId !== user.id) {
      try {
        const { data, error } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', viewerId)
          .eq('followee_id', user.id)
          .limit(1);
        if (!error && data && data.length > 0) {
          is_following = true;
        }
      } catch {
        is_following = false;
      }
    }

    return NextResponse.json({
      data: {
        user,
        counts: {
          followers,
          following,
          projects: projectsCount,
          portfolios: portfoliosCount,
        },
        experiences,
        viewer: {
          is_following,
        },
      },
    });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
