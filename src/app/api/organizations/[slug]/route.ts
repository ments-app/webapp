import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const FACILITATOR_PUBLIC_RELATION_STATUSES = ['approved'];
const CLUB_PUBLIC_RELATION_STATUSES = ['accepted', 'active', 'alumni'];

type ClubMembership = {
  role: 'owner' | 'admin' | 'reviewer' | 'editor';
  status: string;
};

function sanitizeString(value: unknown) {
  const str = String(value || '').trim();
  return str || null;
}

function sanitizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeClubStatus(status: string) {
  if (status === 'requested') return 'pending';
  if (status === 'accepted' || status === 'active' || status === 'alumni') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'suspended';
}

async function fetchStartupMap(
  admin: ReturnType<typeof createAdminClient>,
  startupIds: string[],
  isAdmin: boolean
) {
  let startupsById = new Map<string, {
    id: string;
    brand_name: string;
    description: string | null;
    stage: string;
    entity_type: 'startup' | 'org_project';
    logo_url: string | null;
    city: string | null;
    country: string | null;
    is_published: boolean;
  }>();

  if (startupIds.length === 0) {
    return startupsById;
  }

  let startupQuery = admin
    .from('startup_profiles')
    .select('id, brand_name, description, stage, entity_type, logo_url, city, country, is_published')
    .in('id', startupIds);

  if (!isAdmin) {
    startupQuery = startupQuery.eq('is_published', true);
  }

  const { data: startups, error } = await startupQuery;
  if (error) {
    throw error;
  }

  startupsById = new Map((startups || []).map((startup) => [startup.id, startup]));
  return startupsById;
}

async function buildClubResponse(slug: string, viewerUserId?: string | null) {
  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('org_type', 'club')
    .maybeSingle();

  if (organizationError) {
    return { error: organizationError.message, status: 500 as const };
  }
  if (!organization) {
    return { error: 'Organization not found', status: 404 as const };
  }

  let membership: ClubMembership | null = null;
  if (viewerUserId) {
    const { data: member, error: memberError } = await admin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organization.id)
      .eq('user_id', viewerUserId)
      .maybeSingle();

    if (memberError) {
      return { error: memberError.message, status: 500 as const };
    }

    membership = member as ClubMembership | null;
  }

  const isAdmin = Boolean(membership && membership.status === 'active');
  if (!organization.is_published && !isAdmin) {
    return { error: 'Organization not found', status: 404 as const };
  }

  let relationQuery = admin
    .from('organization_startup_relations')
    .select('id, startup_id, relation_type, status, requested_at, responded_at, created_at')
    .eq('organization_id', organization.id)
    .order('updated_at', { ascending: false });

  if (!isAdmin) {
    relationQuery = relationQuery.in('status', CLUB_PUBLIC_RELATION_STATUSES);
  }

  const { data: relations, error: relationError } = await relationQuery;
  if (relationError) {
    return { error: relationError.message, status: 500 as const };
  }

  let startupsById: Awaited<ReturnType<typeof fetchStartupMap>>;
  try {
    startupsById = await fetchStartupMap(admin, (relations || []).map((relation) => relation.startup_id), isAdmin);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load relations', status: 500 as const };
  }

  const hydratedRelations = (relations || [])
    .map((relation) => ({
      id: relation.id,
      startup_id: relation.startup_id,
      relation_type: relation.relation_type,
      status: normalizeClubStatus(relation.status),
      requested_at: relation.requested_at || relation.created_at,
      responded_at: relation.responded_at,
      notes: null,
      start_date: null,
      end_date: null,
      startup: startupsById.get(relation.startup_id) || null,
    }))
    .filter((relation) => relation.startup);

  return {
    data: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      org_type: organization.org_type,
      short_bio: organization.short_bio,
      description: organization.description,
      website: organization.website,
      contact_email: organization.contact_email,
      logo_url: organization.logo_url,
      banner_url: organization.banner_url,
      city: organization.city,
      state: organization.state,
      country: organization.country,
      university_name: organization.university_name,
      sectors: organization.sectors || [],
      stage_focus: organization.stage_focus || [],
      support_types: organization.support_types || [],
      is_verified: false,
      verification_status: 'approved',
      is_published: organization.is_published,
      created_at: organization.created_at,
      updated_at: organization.updated_at,
      verification_requested_at: null,
      verification_reviewed_at: null,
      verification_submitted_by: null,
      verification_rejection_reason: null,
      verification_details: {},
      is_admin: isAdmin,
      member_role: isAdmin ? membership?.role || null : null,
      relations: hydratedRelations,
    },
  };
}

async function buildFacilitatorResponse(slug: string, viewerUserId?: string | null) {
  const admin = createAdminClient();

  const { data: facilitator, error: facilitatorError } = await admin
    .from('facilitator_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (facilitatorError) {
    return { error: facilitatorError.message, status: 500 as const };
  }
  if (!facilitator) {
    return { error: 'Organization not found', status: 404 as const };
  }

  const { data: adminProfile, error: adminError } = await admin
    .from('admin_profiles')
    .select('id, role, verification_status')
    .eq('id', facilitator.id)
    .maybeSingle();

  if (adminError) {
    return { error: adminError.message, status: 500 as const };
  }
  if (!adminProfile || !['facilitator', 'superadmin'].includes(adminProfile.role)) {
    return { error: 'Organization not found', status: 404 as const };
  }

  const isAdmin = Boolean(viewerUserId && viewerUserId === facilitator.id);
  const isPubliclyVisible = facilitator.is_published && adminProfile.verification_status === 'approved';
  if (!isPubliclyVisible && !isAdmin) {
    return { error: 'Organization not found', status: 404 as const };
  }

  let relationQuery = admin
    .from('startup_facilitator_assignments')
    .select('id, startup_id, relation_type, status, notes, reviewed_at, created_at')
    .eq('facilitator_id', facilitator.id)
    .order('updated_at', { ascending: false });

  if (!isAdmin) {
    relationQuery = relationQuery.in('status', FACILITATOR_PUBLIC_RELATION_STATUSES);
  }

  const { data: relations, error: relationError } = await relationQuery;
  if (relationError) {
    return { error: relationError.message, status: 500 as const };
  }

  let startupsById: Awaited<ReturnType<typeof fetchStartupMap>>;
  try {
    startupsById = await fetchStartupMap(admin, (relations || []).map((relation) => relation.startup_id), isAdmin);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load relations', status: 500 as const };
  }

  const hydratedRelations = (relations || [])
    .map((relation) => ({
      id: relation.id,
      startup_id: relation.startup_id,
      relation_type: relation.relation_type,
      status: relation.status,
      requested_at: relation.created_at,
      responded_at: relation.reviewed_at,
      notes: relation.notes,
      start_date: null,
      end_date: null,
      startup: startupsById.get(relation.startup_id) || null,
    }))
    .filter((relation) => relation.startup);

  return {
    data: {
      id: facilitator.id,
      slug: facilitator.slug,
      name: facilitator.organisation_name,
      org_type: facilitator.organisation_type,
      short_bio: facilitator.short_bio,
      description: facilitator.public_description,
      website: facilitator.website,
      contact_email: facilitator.official_email,
      logo_url: facilitator.logo_url,
      banner_url: facilitator.banner_url,
      city: facilitator.city,
      state: facilitator.state,
      country: facilitator.country,
      university_name: facilitator.university_name,
      sectors: facilitator.sectors || [],
      stage_focus: facilitator.stage_focus || [],
      support_types: facilitator.support_types || [],
      is_verified: adminProfile.verification_status === 'approved',
      verification_status: adminProfile.verification_status,
      is_published: facilitator.is_published,
      created_at: facilitator.created_at,
      updated_at: facilitator.updated_at,
      verification_requested_at: null,
      verification_reviewed_at: facilitator.approved_at || facilitator.rejected_at || null,
      verification_submitted_by: null,
      verification_rejection_reason: facilitator.verification_notes,
      verification_details: {
        official_email: facilitator.official_email,
      },
      is_admin: isAdmin,
      member_role: isAdmin ? 'facilitator' : null,
      relations: hydratedRelations,
    },
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    const clubResult = await buildClubResponse(slug, user?.id);
    if (!('error' in clubResult)) {
      return NextResponse.json(clubResult);
    }
    if (clubResult.status !== 404) {
      return NextResponse.json({ error: clubResult.error }, { status: clubResult.status });
    }

    const facilitatorResult = await buildFacilitatorResponse(slug, user?.id);
    if ('error' in facilitatorResult) {
      return NextResponse.json({ error: facilitatorResult.error }, { status: facilitatorResult.status });
    }
    return NextResponse.json(facilitatorResult);
  } catch (error) {
    console.error('Error fetching organization profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const admin = createAdminClient();

    const { data: club } = await admin
      .from('organizations')
      .select('id, slug')
      .eq('slug', slug)
      .eq('org_type', 'club')
      .maybeSingle();

    if (club) {
      const { data: membership, error: membershipError } = await admin
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', club.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 500 });
      }
      if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const body = await request.json();
      const payload = {
        short_bio: sanitizeString(body.short_bio),
        description: sanitizeString(body.description),
        website: sanitizeString(body.website),
        contact_email: sanitizeString(body.contact_email),
        logo_url: sanitizeString(body.logo_url),
        banner_url: sanitizeString(body.banner_url),
        city: sanitizeString(body.city),
        state: sanitizeString(body.state),
        country: sanitizeString(body.country),
        university_name: sanitizeString(body.university_name),
        sectors: sanitizeTags(body.sectors),
        stage_focus: sanitizeTags(body.stage_focus),
        support_types: sanitizeTags(body.support_types),
        is_published: Boolean(body.is_published),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await admin
        .from('organizations')
        .update(payload)
        .eq('id', club.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      const result = await buildClubResponse(slug, user.id);
      if ('error' in result) {
        return NextResponse.json({ error: 'Profile updated but reload failed' }, { status: 500 });
      }
      return NextResponse.json(result);
    }

    const { data: facilitator, error: facilitatorError } = await admin
      .from('facilitator_profiles')
      .select('id, slug, official_email')
      .eq('slug', slug)
      .maybeSingle();

    if (facilitatorError) {
      return NextResponse.json({ error: facilitatorError.message }, { status: 500 });
    }
    if (!facilitator) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (facilitator.id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const payload = {
      short_bio: sanitizeString(body.short_bio),
      public_description: sanitizeString(body.description),
      website: sanitizeString(body.website),
      official_email: sanitizeString(body.contact_email) || facilitator.official_email,
      logo_url: sanitizeString(body.logo_url),
      banner_url: sanitizeString(body.banner_url),
      city: sanitizeString(body.city),
      state: sanitizeString(body.state),
      country: sanitizeString(body.country),
      university_name: sanitizeString(body.university_name),
      sectors: sanitizeTags(body.sectors),
      stage_focus: sanitizeTags(body.stage_focus),
      support_types: sanitizeTags(body.support_types),
      is_published: Boolean(body.is_published),
      public_updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from('facilitator_profiles')
      .update(payload)
      .eq('id', facilitator.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const result = await buildFacilitatorResponse(slug, user.id);
    if ('error' in result) {
      return NextResponse.json({ error: 'Profile updated but reload failed' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating organization profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
