import { createAuthClient } from '@/utils/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Fetch startups owned by user
    const { data: owned, error: ownedError } = await authClient
      .from('startup_profiles')
      .select(`
        id,
        brand_name,
        stage,
        logo_url,
        is_published,
        is_actively_raising,
        created_at,
        upvote_count:startup_upvotes(count),
        view_count:startup_profile_views(count)
      `)
      .eq('owner_id', user.id)
      .eq('entity_type', 'startup');

    if (ownedError) throw ownedError;

    // Fetch startups where user is an accepted co-founder (but not owner)
    const { data: coFounded, error: coError } = await authClient
      .from('startup_founders')
      .select(`
        startup:startup_profiles(
          id,
          brand_name,
          stage,
          logo_url,
          is_published,
          is_actively_raising,
          created_at,
          owner_id,
          upvote_count:startup_upvotes(count),
          view_count:startup_profile_views(count)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (coError) throw coError;

    // Merge, deduplicate (exclude startups already in owned), and normalize counts
    const ownedIds = new Set((owned || []).map((s) => s.id));

    const normalize = (s: Record<string, unknown>) => ({
      id: s.id,
      brand_name: s.brand_name,
      stage: s.stage,
      logo_url: s.logo_url,
      is_published: s.is_published,
      is_actively_raising: s.is_actively_raising,
      created_at: s.created_at,
      upvote_count: (s.upvote_count as { count: number }[])?.[0]?.count ?? 0,
      view_count: (s.view_count as { count: number }[])?.[0]?.count ?? 0,
      role: 'owner',
    });

    const allStartups = [
      ...(owned || []).map((s) => normalize(s as Record<string, unknown>)),
      ...(coFounded || [])
        .map((f) => f.startup)
        .filter(Boolean)
        .filter((s) => !ownedIds.has(s!.id))
        .map((s) => ({ ...normalize(s as unknown as Record<string, unknown>), role: 'co-founder' })),
    ];

    // Rank by upvotes (primary), views (secondary)
    allStartups.sort((a, b) => {
      if (b.upvote_count !== a.upvote_count) return b.upvote_count - a.upvote_count;
      return b.view_count - a.view_count;
    });

    const leaderboard = allStartups.map((s, index) => ({
      rank: index + 1,
      ...s,
    }));

    return NextResponse.json({ leaderboard, total: leaderboard.length });
  } catch (err) {
    console.error('[leaderboard] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
