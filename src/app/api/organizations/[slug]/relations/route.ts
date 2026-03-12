import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_RELATION_TYPES = new Set(['supported', 'incubated', 'accelerated', 'partnered', 'mentored', 'funded', 'community_member']);

async function authorizeFacilitator(slug: string, userId: string) {
  const admin = createAdminClient();
  const { data: facilitator } = await admin
    .from('facilitator_profiles')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!facilitator || facilitator.id !== userId) {
    return { admin, facilitator: null };
  }

  const { data: adminProfile } = await admin
    .from('admin_profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (!adminProfile || adminProfile.role !== 'facilitator') {
    return { admin, facilitator: null };
  }

  return { admin, facilitator };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { admin, facilitator } = await authorizeFacilitator(slug, user.id);
    if (!facilitator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const startupId = String(body.startup_id || '');
    const relationType = String(body.relation_type || '');

    if (!startupId) {
      return NextResponse.json({ error: 'startup_id is required' }, { status: 400 });
    }
    if (!VALID_RELATION_TYPES.has(relationType)) {
      return NextResponse.json({ error: 'Invalid relation payload' }, { status: 400 });
    }

    const { data: startup } = await admin
      .from('startup_profiles')
      .select('id, brand_name, description, stage, entity_type, logo_url, city, country')
      .eq('id', startupId)
      .maybeSingle();

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const { data: relation, error } = await admin
      .from('startup_facilitator_assignments')
      .upsert({
        startup_id: startupId,
        facilitator_id: facilitator.id,
        status: 'pending',
        assigned_by: facilitator.id,
        relation_type: relationType,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'startup_id,facilitator_id' })
      .select('id, startup_id, relation_type, status, notes, reviewed_at, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: relation.id,
        startup_id: relation.startup_id,
        relation_type: relation.relation_type,
        status: relation.status,
        requested_at: relation.created_at,
        responded_at: relation.reviewed_at,
        notes: relation.notes,
        start_date: null,
        end_date: null,
        startup,
      },
    });
  } catch (error) {
    console.error('Error upserting facilitator relation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { admin, facilitator } = await authorizeFacilitator(slug, user.id);
    if (!facilitator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const startupId = String(body.startup_id || '');
    if (!startupId) {
      return NextResponse.json({ error: 'startup_id is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('startup_facilitator_assignments')
      .delete()
      .eq('startup_id', startupId)
      .eq('facilitator_id', facilitator.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting facilitator relation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
