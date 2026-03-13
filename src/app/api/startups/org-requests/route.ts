import { NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

type StartupOrgRequestRow = {
  id: string;
  startup_id: string;
  startup_name: string;
  relation_type: string;
  status: string;
  requested_at: string | null;
  organization: {
    id: string;
    slug: string;
    name: string;
    org_type: string;
    logo_url: string | null;
    short_bio: string | null;
  };
};

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

    const [facilitatorReqRes, clubReqRes] = await Promise.all([
      admin
        .from('startup_facilitator_assignments')
        .select('id, startup_id, relation_type, status, created_at, facilitator_id')
        .in('startup_id', startupIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      admin
        .from('organization_startup_relations')
        .select('id, startup_id, relation_type, status, requested_at, organization_id, created_at')
        .in('startup_id', startupIds)
        .eq('status', 'requested')
        .order('created_at', { ascending: false }),
    ]);

    if (facilitatorReqRes.error) {
      return NextResponse.json({ error: facilitatorReqRes.error.message }, { status: 500 });
    }
    if (clubReqRes.error) {
      return NextResponse.json({ error: clubReqRes.error.message }, { status: 500 });
    }

    const facilitatorIds = [...new Set((facilitatorReqRes.data || []).map((request) => request.facilitator_id))];
    const clubIds = [...new Set((clubReqRes.data || []).map((request) => request.organization_id))];

    const [facilitatorsRes, clubsRes] = await Promise.all([
      facilitatorIds.length > 0
        ? admin
            .from('facilitator_profiles')
            .select('id, slug, organisation_name, organisation_type, logo_url, short_bio')
            .in('id', facilitatorIds)
        : Promise.resolve({ data: [], error: null }),
      clubIds.length > 0
        ? admin
            .from('organizations')
            .select('id, slug, name, org_type, logo_url, short_bio')
            .in('id', clubIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (facilitatorsRes.error) {
      return NextResponse.json({ error: facilitatorsRes.error.message }, { status: 500 });
    }
    if (clubsRes.error) {
      return NextResponse.json({ error: clubsRes.error.message }, { status: 500 });
    }

    const facilitatorById = new Map((facilitatorsRes.data || []).map((facilitator) => [facilitator.id, facilitator]));
    const clubById = new Map((clubsRes.data || []).map((club) => [club.id, club]));

    const facilitatorRequests = (facilitatorReqRes.data || [])
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
      .filter((item): item is StartupOrgRequestRow => item !== null);

    const clubRequests = (clubReqRes.data || [])
      .map((request) => {
        const club = clubById.get(request.organization_id);
        if (!club?.slug) return null;
        return {
          id: request.id,
          startup_id: request.startup_id,
          startup_name: startupNameById.get(request.startup_id) || 'Project',
          relation_type: request.relation_type,
          status: 'pending',
          requested_at: request.requested_at || request.created_at,
          organization: {
            id: club.id,
            slug: club.slug,
            name: club.name,
            org_type: club.org_type,
            logo_url: club.logo_url,
            short_bio: club.short_bio,
          },
        };
      })
      .filter((item): item is StartupOrgRequestRow => item !== null);

    const data = [...facilitatorRequests, ...clubRequests].sort((a, b) => {
      const aTime = new Date(String(a.requested_at || '')).getTime();
      const bTime = new Date(String(b.requested_at || '')).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching organization requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
