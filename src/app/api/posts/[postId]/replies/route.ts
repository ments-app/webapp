import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }

    const serverSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { postId } = await params;

    const { data, error } = await serverSupabase
      .from('posts')
      .select(`
        *,
        author:author_id(id, username, avatar_url, full_name, is_verified),
        media:post_media(*)
      `)
      .eq('parent_post_id', postId)
      // Include deleted to allow placeholders client-side
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];

    // Helper to normalize avatar URLs (handle storage paths)
    const toPublicUrl = (u?: string | null): string | null => {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;
      if (/^s3:\/\//i.test(u)) return u; // let edge proxy handle s3 scheme
      if (!supabaseUrl) return u; // fallback raw
      // Assume path within public bucket e.g., avatars/... or users/...
      return `${supabaseUrl}/storage/v1/object/public/${u.replace(/^\//, '')}`;
    };

    // If embed didn't populate author, backfill by fetching users in bulk
    const missingAuthor = rows.some((r: unknown) => {
      const post = r as { author?: unknown; author_id?: string };
      return !post.author && post.author_id;
    });
    if (missingAuthor) {
      const authorIds = Array.from(new Set(rows.map((r: unknown) => {
        const post = r as { author_id?: string };
        return post.author_id;
      }).filter(Boolean))) as string[];
      if (authorIds.length > 0) {
        const { data: users, error: usersError } = await serverSupabase
          .from('users')
          .select('id, username, avatar_url, full_name, is_verified')
          .in('id', authorIds);
        if (!usersError && users) {
          // Normalize avatar URLs for backfilled users
          const normalizedUsers = users.map((u: { id: string; username: string; avatar_url?: string | null; full_name?: string; is_verified?: boolean }) => ({ ...u, avatar_url: toPublicUrl(u.avatar_url) }));
          const byId = new Map(normalizedUsers.map((u: { id: string; username: string; avatar_url?: string | null; full_name?: string; is_verified?: boolean }) => [u.id, u]));
          for (const r of rows as Array<{ author?: unknown; author_id?: string }>) {
            if (!r.author && r.author_id) {
              const u = byId.get(r.author_id);
              if (u) r.author = u;
            }
          }
        }
      }
    }

    // Normalize avatar URLs for already-joined authors as well
    for (const r of rows as Array<{ author?: { avatar_url?: string | null } }>) {
      if (r.author) {
        r.author.avatar_url = toPublicUrl(r.author.avatar_url);
      }
    }

    return NextResponse.json(rows, { status: 200 });
  } catch (e: unknown) {
    const error = e as Error | undefined;
    return NextResponse.json({ error: error?.message || 'Failed to fetch replies' }, { status: 500 });
  }
}
