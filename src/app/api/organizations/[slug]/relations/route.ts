import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_RELATION_TYPES = new Set(['incubated', 'accelerated', 'partnered', 'mentored', 'funded', 'community_member']);
const MANAGER_ROLES = new Set(['owner', 'admin', 'reviewer']);

async function authorizeOrganizationMember(slug: string, userId: string) {
  const admin = createAdminClient();
  const { data: organization } = await admin
    .from('organizations')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!organization) return { admin, organization: null, role: null };

  const { data: membership } = await admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return { admin, organization, role: membership?.role ?? null };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { admin, organization, role } = await authorizeOrganizationMember(slug, user.id);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!role || !MANAGER_ROLES.has(role)) {
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

    const { data: existing } = await admin
      .from('organization_startup_relations')
      .select('id, status')
      .eq('organization_id', organization.id)
      .eq('startup_id', startupId)
      .maybeSingle();

    if (existing && ['accepted', 'active', 'alumni'].includes(existing.status)) {
      return NextResponse.json({ error: 'This startup is already linked to the organization' }, { status: 400 });
    }

    const { data: relation, error } = await admin
      .from('organization_startup_relations')
      .upsert({
        organization_id: organization.id,
        startup_id: startupId,
        relation_type: relationType,
        status: 'requested',
        requested_by_user_id: user.id,
        requested_at: new Date().toISOString(),
        responded_by_user_id: null,
        responded_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,startup_id' })
      .select('id, startup_id, relation_type, status, requested_at, responded_at, start_date, end_date')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...relation,
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
    const { admin, organization, role } = await authorizeOrganizationMember(slug, user.id);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!role || !MANAGER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const startupId = String(body.startup_id || '');
    if (!startupId) {
      return NextResponse.json({ error: 'startup_id is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('organization_startup_relations')
      .delete()
      .eq('organization_id', organization.id)
      .eq('startup_id', startupId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization relation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
