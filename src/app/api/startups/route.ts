import { createAdminClient } from '@/utils/supabase-server';
import { NextResponse } from 'next/server';
import { fetchStartups, createStartup } from '@/api/startups';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const stage = searchParams.get('stage') || undefined;
    const raising = searchParams.get('raising') === 'true' ? true : undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const search = searchParams.get('search') || undefined;

    const { data, error, hasMore } = await fetchStartups({ limit, offset, stage, raising, keyword, search });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, hasMore });
  } catch (error) {
    console.error('Error fetching startups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await createStartup({
      ...body,
      owner_id: session.user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating startup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
