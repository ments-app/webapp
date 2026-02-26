import { createAdminClient, createAuthClient } from '@/utils/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('startup_founders')
      .select('*')
      .eq('startup_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching founders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Auth check using the user's session cookies
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { founders, startupName } = await request.json();

    // Use admin client for all DB operations (bypasses RLS so we can send notifications to other users)
    const supabase = createAdminClient();

    // Get existing founders to preserve accepted statuses
    const { data: existing } = await supabase
      .from('startup_founders')
      .select('user_id, status')
      .eq('startup_id', id);

    const acceptedUserIds = new Set(
      (existing || [])
        .filter((f: { user_id: string | null; status: string }) => f.user_id && f.status === 'accepted')
        .map((f: { user_id: string | null }) => f.user_id)
    );

    // Delete existing founders and re-insert
    const { error: deleteError } = await supabase
      .from('startup_founders')
      .delete()
      .eq('startup_id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!founders || founders.length === 0) {
      return NextResponse.json({ success: true });
    }

    const rows = founders.map((f: { name: string; user_id?: string | null; ments_username?: string | null; display_order: number }) => ({
      startup_id: id,
      name: f.name,
      user_id: f.user_id || null,
      ments_username: f.ments_username || null,
      display_order: f.display_order,
      status: f.user_id
        ? acceptedUserIds.has(f.user_id) ? 'accepted' : 'pending'
        : 'accepted',
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('startup_founders')
      .insert(rows)
      .select('id, user_id, name, status');

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send notifications for newly pending founders using admin client (bypasses RLS)
    const pendingFounders = (inserted || []).filter(
      (f: { id: string; user_id: string | null; name: string; status: string }) => f.status === 'pending' && f.user_id
    );

    if (pendingFounders.length > 0) {
      const notifInserts = pendingFounders.map((f: { id: string; user_id: string; name: string }) => ({
        recipient_id: f.user_id,
        type: 'cofounder_request',
        content: `You've been added as a co-founder of ${startupName || 'a startup'}`,
        is_read: false,
        actor_id: user.id,
        extra: {
          startup_id: id,
          startup_name: startupName || '',
          requester_id: user.id,
          founder_id: f.id,
          founder_name: f.name,
        },
      }));
      const { error: notifError } = await supabase.from('inapp_notification').insert(notifInserts);
      if (notifError) {
        console.error('Failed to insert cofounder notifications:', notifError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating founders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
