import { NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: startups, error: startupError } = await admin
      .from('startup_profiles')
      .select('id, brand_name')
      .eq('owner_id', user.id);

    if (startupError) {
      return NextResponse.json({ error: startupError.message }, { status: 500 });
    }

    const startupIds = (startups || []).map((startup) => startup.id);
    if (startupIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const startupNameById = new Map((startups || []).map((startup) => [startup.id, startup.brand_name]));

    const { data: requests, error: requestError } = await admin
      .from('organization_startup_relations')
      .select('id, startup_id, relation_type, status, requested_at, organization_id')
      .in('startup_id', startupIds)
      .eq('status', 'requested')
      .order('requested_at', { ascending: false });

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    const orgIds = [...new Set((requests || []).map((request) => request.organization_id))];
    if (orgIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: organizations, error: orgError } = await admin
      .from('organizations')
      .select('id, slug, name, org_type, logo_url, short_bio')
      .in('id', orgIds);

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    const organizationById = new Map((organizations || []).map((organization) => [organization.id, organization]));

    const data = (requests || [])
      .map((request) => ({
        id: request.id,
        startup_id: request.startup_id,
        startup_name: startupNameById.get(request.startup_id) || 'Startup',
        relation_type: request.relation_type,
        status: request.status,
        requested_at: request.requested_at,
        organization: organizationById.get(request.organization_id),
      }))
      .filter((request) => request.organization);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching startup org requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

