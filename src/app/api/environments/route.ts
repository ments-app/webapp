import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getProcessedImageUrl } from '@/utils/imageUtils';

export const runtime = 'nodejs';

// Type definition matching the database table
export interface Environment {
  id: string;
  name: string;
  picture: string | null;
  created_at: string;
  banner: string | null;
  description: string | null;
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not set');
  }
  return createClient(url, anonKey);
}

export async function GET() {
  try {
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from('environments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching environments:', error);
      return NextResponse.json({ error: 'Failed to fetch environments' }, { status: 500 });
    }

    const list = Array.isArray(data) ? data : [];

    // Process image URLs via proxy/optimizer if available
    const processed = await Promise.all(
      list.map(async (env) => {
        try {
          const [processedPicture, processedBanner] = await Promise.all([
            getProcessedImageUrl(env.picture),
            getProcessedImageUrl(env.banner),
          ]);
          return { ...env, picture: processedPicture, banner: processedBanner } as Environment;
        } catch (e) {
          console.warn('Image processing failed for env', env.id, e);
          return env as Environment;
        }
      })
    );

    return NextResponse.json(processed, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in /api/environments', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
