import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action === 'accept' ? 'accept' : body.action === 'reject' ? 'reject' : null;
    if (!action) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: facilitatorRelation, error: facilitatorError } = await admin
      .from('startup_facilitator_assignments')
      .select('id, startup_id, status')
      .eq('id', id)
      .maybeSingle();

    if (facilitatorError) {
      return NextResponse.json({ error: facilitatorError.message }, { status: 500 });
    }

    if (facilitatorRelation) {
      if (facilitatorRelation.status !== 'pending') {
        return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
      }

      const { data: startup, error: startupError } = await admin
        .from('startup_profiles')
        .select('owner_id')
        .eq('id', facilitatorRelation.startup_id)
        .maybeSingle();

      if (startupError) {
        return NextResponse.json({ error: startupError.message }, { status: 500 });
      }
      if (!startup || startup.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const nextStatus = action === 'accept' ? 'approved' : 'rejected';
      const { data, error } = await admin
        .from('startup_facilitator_assignments')
        .update({
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    const { data: clubRelation, error: clubError } = await admin
      .from('organization_startup_relations')
      .select('id, startup_id, status')
      .eq('id', id)
      .maybeSingle();

    if (clubError) {
      return NextResponse.json({ error: clubError.message }, { status: 500 });
    }
    if (!clubRelation) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (clubRelation.status !== 'requested') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
    }

    const { data: startup, error: startupError } = await admin
      .from('startup_profiles')
      .select('owner_id')
      .eq('id', clubRelation.startup_id)
      .maybeSingle();

    if (startupError) {
      return NextResponse.json({ error: startupError.message }, { status: 500 });
    }
    if (!startup || startup.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { error } = await admin
      .from('organization_startup_relations')
      .update({
        status: nextStatus,
        responded_by_user_id: user.id,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id,
        status: action === 'accept' ? 'approved' : 'rejected',
      },
    });
  } catch (error) {
    console.error('Error responding to organization request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
