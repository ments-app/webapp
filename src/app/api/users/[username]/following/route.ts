import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';

// GET /api/users/[username]/following
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { username } = await params;
    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    const { searchParams } = new URL(_req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Resolve user id by username
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = userRow.id as string;

    // Get followee IDs (users this account is following) with pagination
    const { data: rels, error: relErr } = await supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1);

    if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

    const followeeIds = (rels || [])
      .map((r: { followee_id: string | null }) => r.followee_id)
      .filter(Boolean) as string[];
    if (followeeIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch followee profiles with extra info
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, is_verified, about, tagline, current_city, user_type')
      .in('id', followeeIds)
      .eq('account_status', 'active')
      .order('full_name', { ascending: true });

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });
    if (!users || users.length === 0) return NextResponse.json({ data: [] });

    // Get follower counts for each user
    const { data: followerRels } = await supabase
      .from('user_follows')
      .select('followee_id')
      .in('followee_id', users.map((u: { id: string }) => u.id));

    const followerCountMap: Record<string, number> = {};
    (followerRels || []).forEach((r: { followee_id: string }) => {
      followerCountMap[r.followee_id] = (followerCountMap[r.followee_id] || 0) + 1;
    });

    // If there's a viewer, get their follow status
    const viewerId = searchParams.get('viewerId');
    let followStatusMap: Record<string, boolean> = {};
    if (viewerId) {
      const { data: viewerFollows } = await supabase
        .from('user_follows')
        .select('followee_id')
        .eq('follower_id', viewerId)
        .in('followee_id', users.map((u: { id: string }) => u.id));

      if (viewerFollows) {
        followStatusMap = viewerFollows.reduce((acc: Record<string, boolean>, f: { followee_id: string }) => {
          acc[f.followee_id] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }
    }

    const enriched = users.map((user: { id: string; username: string; full_name: string; avatar_url: string | null; is_verified: boolean; about: string | null; tagline: string | null; current_city: string | null; user_type: string | null }) => ({
      ...user,
      followers_count: followerCountMap[user.id] || 0,
      is_following: followStatusMap[user.id] || false,
    }));

    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('[following API] error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
