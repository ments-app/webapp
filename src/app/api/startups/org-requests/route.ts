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
      .from('startup_facilitator_assignments')
      .select('id, startup_id, relation_type, status, created_at, facilitator_id')
      .in('startup_id', startupIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    const facilitatorIds = [...new Set((requests || []).map((request) => request.facilitator_id))];
    if (facilitatorIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: facilitators, error: facilitatorError } = await admin
      .from('facilitator_profiles')
      .select('id, slug, organisation_name, organisation_type, logo_url, short_bio')
      .in('id', facilitatorIds);

    if (facilitatorError) {
      return NextResponse.json({ error: facilitatorError.message }, { status: 500 });
    }

    const facilitatorById = new Map((facilitators || []).map((facilitator) => [facilitator.id, facilitator]));

    const data = (requests || [])
      .map((request) => {
        const facilitator = facilitatorById.get(request.facilitator_id);
        if (!facilitator?.slug) return null;
        return {
          id: request.id,
          startup_id: request.startup_id,
          startup_name: startupNameById.get(request.startup_id) || 'Startup',
          relation_type: request.relation_type,
          status: request.status,
          requested_at: request.created_at,
          organization: {
            id: facilitator.id,
            slug: facilitator.slug,
            name: facilitator.organisation_name,
            org_type: facilitator.organisation_type,
            logo_url: facilitator.logo_url,
            short_bio: facilitator.short_bio,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching startup facilitator requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
