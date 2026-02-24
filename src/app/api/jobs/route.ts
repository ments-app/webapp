import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';
import { cacheGet, cacheSet } from '@/lib/cache';

const CACHE_PREFIX = 'jobs';
const CACHE_TTL = 60; // 1 minute

export async function GET(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = Number(searchParams.get('limit') || '20');
    const orderBy = (searchParams.get('orderBy') || 'created_at') as 'created_at' | 'deadline';
    const ascending = searchParams.get('ascending') === 'true';

    // Check cache
    const cacheKey = `${CACHE_PREFIX}:active=${activeOnly}&limit=${limit}&order=${orderBy}&asc=${ascending}`;
    const cached = cacheGet<{ data: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      });
    }

    let query = supabase
      .from('jobs')
      .select('*')
      .order(orderBy, { ascending, nullsFirst: false })
      .limit(Math.max(1, Math.min(100, limit)));

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { data: data || [] };
    cacheSet(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
