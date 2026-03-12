import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';
import { getFacilitatorSetupUrl } from '@/utils/businessApp';

export const dynamic = 'force-dynamic';

const VALID_ORG_TYPES = new Set([
  'ecell',
  'incubator',
  'accelerator',
  'college_cell',
  'other',
]);

export async function GET(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === 'true';
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const orgType = searchParams.get('org_type');

    if (mine && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let facilitatorQuery = admin
      .from('facilitator_profiles')
      .select('id, slug, organisation_name, organisation_type, website, official_email, logo_url, city, state, country, short_bio, public_description, is_published, sectors, support_types, created_at');

    if (mine && user) {
      facilitatorQuery = facilitatorQuery.eq('id', user.id);
    } else {
      facilitatorQuery = facilitatorQuery.eq('is_published', true).not('slug', 'is', null);
    }

    if (orgType && VALID_ORG_TYPES.has(orgType)) {
      facilitatorQuery = facilitatorQuery.eq('organisation_type', orgType);
    }

    const { data: facilitators, error: facilitatorError } = await facilitatorQuery.order('created_at', { ascending: false });
    if (facilitatorError) {
      return NextResponse.json({ error: facilitatorError.message }, { status: 500 });
    }

    const facilitatorIds = (facilitators || []).map((item) => item.id);
    if (facilitatorIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: adminProfiles, error: adminError } = await admin
      .from('admin_profiles')
      .select('id, role, verification_status')
      .in('id', facilitatorIds);

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    const adminById = new Map((adminProfiles || []).map((item) => [item.id, item]));

    const data = (facilitators || [])
      .map((facilitator) => {
        const adminProfile = adminById.get(facilitator.id);
        if (!adminProfile || adminProfile.role !== 'facilitator') {
          return null;
        }
        if (!mine && adminProfile.verification_status !== 'approved') {
          return null;
        }

        const matchesSearch = !search || [
          facilitator.organisation_name,
          facilitator.short_bio,
          facilitator.public_description,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));

        if (!matchesSearch) {
          return null;
        }

        return {
          id: facilitator.id,
          slug: facilitator.slug,
          name: facilitator.organisation_name,
          org_type: facilitator.organisation_type,
          short_bio: facilitator.short_bio,
          website: facilitator.website,
          logo_url: facilitator.logo_url,
          city: facilitator.city,
          state: facilitator.state,
          country: facilitator.country,
          is_verified: adminProfile.verification_status === 'approved',
          verification_status: adminProfile.verification_status,
          is_published: facilitator.is_published,
          sectors: facilitator.sectors || [],
          support_types: facilitator.support_types || [],
          created_at: facilitator.created_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching facilitators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Startup facilitators must be created in business.ments.app',
    redirect_url: getFacilitatorSetupUrl(),
  }, { status: 405 });
}
