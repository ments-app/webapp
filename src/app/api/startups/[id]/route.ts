import { createAdminClient, createAuthClient } from '@/utils/supabase-server';
import { NextResponse } from 'next/server';
import { fetchStartupById, updateStartup } from '@/api/startups';
import { cacheClearByPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await fetchStartupById(id, session?.user?.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching startup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await updateStartup(id, body);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate startups cache on update
    cacheClearByPrefix('startups');

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating startup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify user is owner or accepted cofounder
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const isOwner = startup.owner_id === user.id;
    if (!isOwner) {
      const { data: founder } = await supabase
        .from('startup_founders')
        .select('id')
        .eq('startup_id', id)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (!founder) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('startup_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    cacheClearByPrefix('startups');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting startup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

