import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';
import { getFacilitatorSetupUrl } from '@/utils/businessApp';

export const dynamic = 'force-dynamic';

const VALID_ORG_TYPES = new Set([
  'ecell',
  'incubator',
  'accelerator',
  'club',
  'college_cell',
  'other',
]);

type OrganizationListRow = {
  id: string;
  slug: string;
  name: string;
  org_type: string;
  short_bio: string | null;
  website: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_verified: boolean;
  verification_status: string;
  is_published: boolean;
  sectors: string[];
  support_types: string[];
  created_at: string;
};

function sanitizeString(value: unknown) {
  const str = String(value || '').trim();
  return str || null;
}

function sanitizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'club';
}

async function buildUniqueSlug(admin: ReturnType<typeof createAdminClient>, name: string) {
  const baseSlug = slugify(name);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const [facilitatorRes, organizationRes] = await Promise.all([
      admin.from('facilitator_profiles').select('id').eq('slug', candidate).maybeSingle(),
      admin.from('organizations').select('id').eq('slug', candidate).maybeSingle(),
    ]);

    if (facilitatorRes.error) throw facilitatorRes.error;
    if (organizationRes.error) throw organizationRes.error;

    if (!facilitatorRes.data && !organizationRes.data) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

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
    let adminById = new Map<string, { id: string; role: string; verification_status: string }>();
    if (facilitatorIds.length > 0) {
      const { data: adminProfiles, error: adminError } = await admin
        .from('admin_profiles')
        .select('id, role, verification_status')
        .in('id', facilitatorIds);

      if (adminError) {
        return NextResponse.json({ error: adminError.message }, { status: 500 });
      }

      adminById = new Map((adminProfiles || []).map((item) => [item.id, item]));
    }

    const facilitatorItems = (facilitators || [])
      .map((facilitator) => {
        const adminProfile = adminById.get(facilitator.id);
        if (!adminProfile || !['facilitator', 'superadmin'].includes(adminProfile.role)) {
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
      .filter((item): item is OrganizationListRow => item !== null);

    let clubItems: OrganizationListRow[] = [];

    if (mine && user) {
      const { data: memberships, error: membershipError } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 500 });
      }

      const organizationIds = (memberships || []).map((item) => item.organization_id);
      if (organizationIds.length > 0 && (!orgType || orgType === 'club')) {
        const clubsQuery = admin
          .from('organizations')
          .select('id, slug, name, org_type, short_bio, website, logo_url, city, state, country, is_published, sectors, support_types, created_at')
          .in('id', organizationIds)
          .eq('org_type', 'club');

        const { data: clubs, error: clubsError } = await clubsQuery.order('created_at', { ascending: false });
        if (clubsError) {
          return NextResponse.json({ error: clubsError.message }, { status: 500 });
        }

        clubItems = (clubs || []).map((club) => ({
          id: club.id,
          slug: club.slug,
          name: club.name,
          org_type: club.org_type,
          short_bio: club.short_bio,
          website: club.website,
          logo_url: club.logo_url,
          city: club.city,
          state: club.state,
          country: club.country,
          is_verified: false,
          verification_status: 'approved',
          is_published: club.is_published,
          sectors: club.sectors || [],
          support_types: club.support_types || [],
          created_at: club.created_at,
        }));
      }
    } else if (!orgType || orgType === 'club') {
      const { data: clubs, error: clubsError } = await admin
        .from('organizations')
        .select('id, slug, name, org_type, short_bio, website, logo_url, city, state, country, is_published, sectors, support_types, created_at')
        .eq('org_type', 'club')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (clubsError) {
        return NextResponse.json({ error: clubsError.message }, { status: 500 });
      }

      clubItems = (clubs || [])
        .filter((club) => {
          if (!search) return true;
          return [club.name, club.short_bio].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
        })
        .map((club) => ({
          id: club.id,
          slug: club.slug,
          name: club.name,
          org_type: club.org_type,
          short_bio: club.short_bio,
          website: club.website,
          logo_url: club.logo_url,
          city: club.city,
          state: club.state,
          country: club.country,
          is_verified: false,
          verification_status: 'approved',
          is_published: club.is_published,
          sectors: club.sectors || [],
          support_types: club.support_types || [],
          created_at: club.created_at,
        }));
    }

    const data = [...facilitatorItems, ...clubItems].sort((a, b) => {
      const aTime = new Date(String(a.created_at || '')).getTime();
      const bTime = new Date(String(b.created_at || '')).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching facilitators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const type = String(body.type || '');

    if (type !== 'club') {
      return NextResponse.json({
        error: 'Startup facilitators must be created in business.ments.app',
        redirect_url: getFacilitatorSetupUrl(),
      }, { status: 405 });
    }

    const admin = createAdminClient();
    const { data: adminProfile, error: adminProfileError } = await admin
      .from('admin_profiles')
      .select('id, role, email')
      .eq('id', user.id)
      .maybeSingle();

    if (adminProfileError) {
      return NextResponse.json({ error: adminProfileError.message }, { status: 500 });
    }
    if (!adminProfile || !['superadmin', 'facilitator'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Only platform admins can create club profiles' }, { status: 403 });
    }

    const organisationName = sanitizeString(body.organisation_name);
    if (!organisationName) {
      return NextResponse.json({ error: 'organisation_name is required' }, { status: 400 });
    }

    const slug = await buildUniqueSlug(admin, organisationName);

    const insertPayload = {
      slug,
      name: organisationName,
      org_type: 'club',
      short_bio: sanitizeString(body.short_bio),
      description: sanitizeString(body.description),
      website: sanitizeString(body.website),
      contact_email: sanitizeString(body.contact_email) || adminProfile.email,
      logo_url: sanitizeString(body.logo_url),
      banner_url: sanitizeString(body.banner_url),
      city: sanitizeString(body.city),
      state: sanitizeString(body.state),
      country: sanitizeString(body.country),
      university_name: sanitizeString(body.university_name),
      sectors: sanitizeTags(body.sectors),
      stage_focus: sanitizeTags(body.stage_focus),
      support_types: sanitizeTags(body.support_types),
      is_published: false,
      created_by: user.id,
    };

    const { data: insertedOrg, error: insertError } = await admin
      .from('organizations')
      .insert(insertPayload)
      .select('id, slug')
      .single();

    if (insertError || !insertedOrg) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: membershipError } = await admin
      .from('organization_members')
      .insert({
        organization_id: insertedOrg.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (membershipError) {
      await admin.from('organizations').delete().eq('id', insertedOrg.id);
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: insertedOrg.id,
        slug: insertedOrg.slug,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
