import { NextRequest, NextResponse } from 'next/server';
import { cacheClearAll, cacheClearByPrefix, cacheStats } from '@/lib/cache';
import { createAuthClient } from '@/utils/supabase-server';

/**
 * POST /api/cache/clear — Clear server-side in-memory cache.
 * 
 * Query params:
 *   ?prefix=trending  — only clear keys starting with "trending"
 *   (no prefix)       — clear everything
 * 
 * Response: { cleared: number, remaining: number }
 */
export async function POST(req: NextRequest) {
    try {
        // Auth check — only authenticated users can clear cache
        const supabase = await createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const prefix = searchParams.get('prefix') || undefined;

        let cleared: number;
        if (prefix) {
            cleared = cacheClearByPrefix(prefix);
        } else {
            cleared = cacheClearAll();
        }

        const stats = cacheStats();

        return NextResponse.json({
            cleared,
            remaining: stats.size,
            prefix: prefix || null,
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/cache/clear — View cache stats (debug).
 */
export async function GET() {
    try {
        const supabase = await createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stats = cacheStats();
        return NextResponse.json(stats);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
