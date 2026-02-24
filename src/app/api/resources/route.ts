import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cacheGet, cacheSet } from '@/lib/cache';

const CACHE_PREFIX = 'resources';
const CACHE_TTL = 120; // 2 minutes

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const category = searchParams.get('category');
    const limit = Number(searchParams.get('limit') || '50');
    const orderBy = (searchParams.get('orderBy') || 'created_at') as string;
    const ascending = searchParams.get('ascending') === 'true';

    // Check cache
    const cacheKey = `${CACHE_PREFIX}:active=${activeOnly}&cat=${category || ''}&limit=${limit}&order=${orderBy}&asc=${ascending}`;
    const cached = cacheGet<{ data: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
      });
    }

    let query = getSupabase()
      .from('resources')
      .select('*')
      .order(orderBy, { ascending, nullsFirst: false })
      .limit(Math.max(1, Math.min(500, limit)));

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { data: data || [] };
    cacheSet(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
