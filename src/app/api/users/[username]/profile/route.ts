import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Base URL for Supabase public assets
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Try to produce a browser-usable URL for a storage object reference.
// Handles: https URLs, s3:// URLs, Supabase storage paths, bucket/key paths.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function toUsableUrl(u: string | null | undefined, supabase: SupabaseClient): Promise<string | null> {
  if (!u) return null;
  const s = u.trim();
  if (!s) return null;
  // Already a valid HTTP(S) URL — use as-is
  if (/^https?:\/\//i.test(s)) return s;
  // S3 protocol URLs: s3://bucket-name/path → https://bucket-name.s3.amazonaws.com/path
  const s3Match = s.match(/^s3:\/\/([^/]+)\/(.+)$/i);
  if (s3Match) {
    const [, bucket, key] = s3Match;
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
  // Supabase storage public path
  if (/^\/?storage\/v1\/object\/public\//i.test(s)) {
    const pathOnly = s.replace(/^\/+/, '');
    return getSupabaseUrl() ? `${getSupabaseUrl()}/${pathOnly}` : `/${pathOnly}`;
  }
  // Shorthand public path (e.g. 'public/avatars/...')
  if (/^public\//i.test(s)) {
    const pathOnly = s.replace(/^\/+/, '');
    return getSupabaseUrl() ? `${getSupabaseUrl()}/storage/v1/object/${pathOnly}` : `/storage/v1/object/${pathOnly}`;
  }
  // Bucket/key path — try signed URL, fallback to public URL pattern
  const path = s.replace(/^\/+/, '');
  const firstSlash = path.indexOf('/');
  if (firstSlash > 0) {
    const bucket = path.slice(0, firstSlash);
    const key = path.slice(firstSlash + 1);
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60);
      if (!error && data?.signedUrl) return data.signedUrl as string;
    } catch { }
    if (getSupabaseUrl()) {
      return `${getSupabaseUrl()}/storage/v1/object/public/${path}`;
    }
  }
  return null;
}




// GET /api/users/[username]/profile?viewerId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get('viewerId');
    const { username: rawUsername } = await params;
    const username = (rawUsername || '').trim();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const supabase = await createAuthClient();

    // Call the DB function — handles deactivated check + full profile in one query
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_public_profile', {
      p_username: username,
      p_viewer_id: viewerId || null,
    });

    if (rpcError) {
      console.error('[profile API] RPC error:', rpcError.message);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    if (!rpcResult) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rpcResult });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
