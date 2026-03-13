import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_RELATION_TYPES = new Set(['supported', 'incubated', 'accelerated', 'partnered', 'mentored', 'funded', 'community_member', 'club_project']);

async function authorizeOrganization(slug: string, userId: string) {
  const admin = createAdminClient();

  const { data: club } = await admin
    .from('organizations')
    .select('id, slug, org_type')
    .eq('slug', slug)
    .eq('org_type', 'club')
    .maybeSingle();

  if (club) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', club.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (membership && membership.status === 'active' && ['owner', 'admin', 'reviewer'].includes(membership.role)) {
      return { admin, kind: 'club' as const, organizationId: club.id };
    }

    return { admin, kind: null, organizationId: null };
  }

  const { data: facilitator } = await admin
    .from('facilitator_profiles')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!facilitator || facilitator.id !== userId) {
    return { admin, kind: null, organizationId: null };
  }

  const { data: adminProfile } = await admin
    .from('admin_profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (!adminProfile || !['facilitator', 'superadmin'].includes(adminProfile.role)) {
    return { admin, kind: null, organizationId: null };
  }

  return { admin, kind: 'facilitator' as const, organizationId: facilitator.id };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { admin, kind, organizationId } = await authorizeOrganization(slug, user.id);
    if (!kind || !organizationId) {
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

    if (kind === 'club') {
      if (relationType !== 'club_project') {
        return NextResponse.json({ error: 'Clubs can only create club_project relations' }, { status: 400 });
      }
      if (startup.entity_type !== 'org_project') {
        return NextResponse.json({ error: 'Clubs can only be linked to org projects' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const { data: relation, error } = await admin
        .from('organization_startup_relations')
        .upsert({
          organization_id: organizationId,
          startup_id: startupId,
          relation_type: relationType,
          status: 'requested',
          requested_by_user_id: user.id,
          requested_at: now,
          responded_by_user_id: null,
          responded_at: null,
          updated_at: now,
        }, { onConflict: 'organization_id,startup_id' })
        .select('id, startup_id, relation_type, status, requested_at, responded_at, created_at')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data: {
          id: relation.id,
          startup_id: relation.startup_id,
          relation_type: relation.relation_type,
          status: 'pending',
          requested_at: relation.requested_at || relation.created_at,
          responded_at: relation.responded_at,
          notes: null,
          start_date: null,
          end_date: null,
          startup,
        },
      });
    }

    if (relationType === 'club_project') {
      return NextResponse.json({ error: 'Invalid relation payload' }, { status: 400 });
    }

    const { data: relation, error } = await admin
      .from('startup_facilitator_assignments')
      .upsert({
        startup_id: startupId,
        facilitator_id: organizationId,
        status: 'pending',
        assigned_by: organizationId,
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
    console.error('Error upserting organization relation:', error);
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
    const { admin, kind, organizationId } = await authorizeOrganization(slug, user.id);
    if (!kind || !organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const startupId = String(body.startup_id || '');
    if (!startupId) {
      return NextResponse.json({ error: 'startup_id is required' }, { status: 400 });
    }

    const query = kind === 'club'
      ? admin.from('organization_startup_relations').delete().eq('startup_id', startupId).eq('organization_id', organizationId)
      : admin.from('startup_facilitator_assignments').delete().eq('startup_id', startupId).eq('facilitator_id', organizationId);

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization relation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
