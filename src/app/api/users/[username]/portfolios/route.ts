import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/users/[username]/portfolios
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

    // resolve user id
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (userError) console.warn('[portfolios API] user fetch error:', userError.message);
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // fetch portfolios for user
    const { data: portfolios, error: pfError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userRow.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (pfError) {
      console.warn('[portfolios API] fetch error:', pfError.message);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: portfolios || [] });
  } catch (e) {
    console.error('Error in portfolios API:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
