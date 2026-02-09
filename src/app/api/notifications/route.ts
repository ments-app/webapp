import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';

// GET /api/notifications?userId=...&page=...&limit=...&unreadOnly=...&type=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    const supabase = await createAuthClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type NotifRow = Record<string, any>;

    // Fetch legacy notifications (graceful if table missing)
    let legacyNotifications: NotifRow[] = [];
    try {
      let legacyQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);
      if (unreadOnly) legacyQuery = legacyQuery.eq('read', false);
      if (type) legacyQuery = legacyQuery.eq('type', type);
      legacyQuery = legacyQuery.order('created_at', { ascending: false });
      const { data, error: legacyError } = await legacyQuery;
      if (!legacyError && data) legacyNotifications = data;
    } catch {
      // Ignore — table may not exist
    }

    // Fetch in-app notifications (graceful if table missing)
    let inappNotifications: NotifRow[] = [];
    try {
      let inappQuery = supabase
        .from('inapp_notification')
        .select('*')
        .eq('recipient_id', userId);
      if (unreadOnly) inappQuery = inappQuery.eq('is_read', false);
      if (type) inappQuery = inappQuery.eq('type', type);
      inappQuery = inappQuery.order('created_at', { ascending: false });
      const { data, error: inappError } = await inappQuery;
      if (!inappError && data) inappNotifications = data;
    } catch {
      // Ignore — table may not exist
    }

    // Normalize both notification sources to a common shape for frontend
    const legacyList: NotifRow[] = (legacyNotifications || []).map(n => ({
      ...n,
      notification_source: 'legacy',
      is_read: n.read,
      recipient_id: n.user_id,
    }));
    const inappList: NotifRow[] = (inappNotifications || []).map(n => ({
      ...n,
      notification_source: 'inapp',
      read: n.is_read,
      user_id: n.recipient_id,
    }));

    // Merge and sort by created_at desc
    const merged = [...legacyList, ...inappList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = merged.length;
    const paged = merged.slice(offset, offset + limit);

    return NextResponse.json({
      data: paged,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH method to mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationIds, markAllAsRead } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = await createAuthClient();

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (markAllAsRead) {
      query = query.eq('read', false);
    } else if (notificationIds && Array.isArray(notificationIds)) {
      query = query.in('id', notificationIds);
    } else {
      return NextResponse.json({ error: 'Either notificationIds array or markAllAsRead flag is required' }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// HEAD method for unread count
export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse(null, { status: 400, headers: { 'X-Error': 'userId parameter is required' } });
    }

    const supabase = await createAuthClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      return new NextResponse(null, { status: 500, headers: { 'X-Error': 'Failed to fetch unread count' } });
    }

    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Unread-Count': (count || 0).toString() },
    });
  } catch {
    return new NextResponse(null, { status: 500, headers: { 'X-Error': 'Internal server error' } });
  }
}
