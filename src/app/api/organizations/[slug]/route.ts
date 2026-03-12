import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createAuthClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const PUBLIC_RELATION_STATUSES = ['accepted', 'active', 'alumni'];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const admin = createAdminClient();
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    const { data: organization, error } = await admin
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let memberRole: string | null = null;
    if (user) {
      const { data: membership } = await admin
        .from('organization_members')
        .select('role')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      memberRole = membership?.role ?? null;
    }

    const isAdmin = !!memberRole;
    if (!organization.is_published && !isAdmin) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let relationQuery = admin
      .from('organization_startup_relations')
      .select('id, startup_id, relation_type, status, requested_at, responded_at, start_date, end_date')
      .eq('organization_id', organization.id)
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      relationQuery = relationQuery.in('status', PUBLIC_RELATION_STATUSES);
    }

    const { data: relations, error: relationError } = await relationQuery;
    if (relationError) {
      return NextResponse.json({ error: relationError.message }, { status: 500 });
    }

    const startupIds = (relations || []).map((relation) => relation.startup_id);
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

    if (startupIds.length > 0) {
      let startupQuery = admin
        .from('startup_profiles')
        .select('id, brand_name, description, stage, entity_type, logo_url, city, country, is_published')
        .in('id', startupIds);

      if (!isAdmin) {
        startupQuery = startupQuery.eq('is_published', true);
      }

      const { data: startups, error: startupError } = await startupQuery;
      if (startupError) {
        return NextResponse.json({ error: startupError.message }, { status: 500 });
      }

      startupsById = new Map((startups || []).map((startup) => [startup.id, startup]));
    }

    const hydratedRelations = (relations || [])
      .map((relation) => ({
        ...relation,
        startup: startupsById.get(relation.startup_id) || null,
      }))
      .filter((relation) => relation.startup);

    return NextResponse.json({
      data: {
        ...organization,
        is_admin: isAdmin,
        member_role: memberRole,
        relations: hydratedRelations,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
