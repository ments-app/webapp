import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/users/[username]/following
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    // Resolve user id by username
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = userRow.id as string;

    // Get followee IDs (users this account is following)
    const { data: rels, error: relErr } = await supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .limit(2000);

    if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

    const followeeIds = (rels || [])
      .map((r: { followee_id: string | null }) => r.followee_id)
      .filter(Boolean) as string[];
    if (followeeIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch followee profiles
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, is_verified')
      .in('id', followeeIds)
      .order('full_name', { ascending: true });

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

    return NextResponse.json({ data: users || [] });
  } catch (e) {
    console.error('[following API] error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
