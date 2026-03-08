import { createAuthClient } from '@/utils/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authClient = await createAuthClient();

    const { data, error } = await authClient
      .from('startup_funding_rounds')
      .select('*')
      .eq('startup_id', id)
      .order('round_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching funding rounds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rounds } = await request.json();

    // Delete existing rounds and re-insert using the auth client (respects RLS)
    const { error: deleteError } = await authClient
      .from('startup_funding_rounds')
      .delete()
      .eq('startup_id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (rounds && rounds.length > 0) {
      const { error: insertError } = await authClient
        .from('startup_funding_rounds')
        .insert(rounds.map((r: { investor?: string; amount?: string; round_type?: string; round_date?: string; is_public?: boolean }) => ({ ...r, startup_id: id })));

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating funding rounds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
