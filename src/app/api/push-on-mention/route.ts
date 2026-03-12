import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/utils/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the caller
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, mentionedUserId } = await request.json();

    if (!postId || !mentionedUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Derive mentionerId from the authenticated session, not the request body
    const mentionerId = user.id;

    // Skip self-mentions
    if (mentionerId === mentionedUserId) {
      return NextResponse.json({ success: true });
    }

    const serviceClient = createServiceClient();

    // Verify the post exists and was authored by the caller — prevents notification spam
    // where any user could mention-notify any other user on any post.
    const { data: postRow } = await serviceClient
      .from('posts')
      .select('author_id, content')
      .eq('id', postId)
      .eq('deleted', false)
      .maybeSingle();

    if (!postRow || postRow.author_id !== mentionerId) {
      return NextResponse.json({ success: true }); // silent — caller doesn't own this post
    }

    // Verify the mentioned user actually exists and their username is in the post content.
    // This prevents abusing the endpoint to spam arbitrary user IDs.
    const { data: mentionedUser } = await serviceClient
      .from('users')
      .select('username')
      .eq('id', mentionedUserId)
      .eq('account_status', 'active')
      .maybeSingle();

    if (!mentionedUser) {
      return NextResponse.json({ success: true }); // user not found or inactive
    }

    const postContent = postRow.content ?? '';
    const mentionPattern = new RegExp(`@${mentionedUser.username}(?:\\b|$)`, 'i');
    if (!mentionPattern.test(postContent)) {
      return NextResponse.json({ success: true }); // username not actually in the post
    }

    // Write in-app notification directly (primary path — no edge function dependency)
    try {
      const { data: mentionerProfile } = await serviceClient
        .from('users')
        .select('username, full_name, avatar_url')
        .eq('id', mentionerId)
        .maybeSingle();

      await serviceClient.from('inapp_notification').insert({
        recipient_id: mentionedUserId,
        type: 'mention',
        content: postContent,
        is_read: false,
        actor_id: mentionerId,
        actor_name: mentionerProfile?.full_name ?? null,
        actor_username: mentionerProfile?.username ?? null,
        actor_avatar_url: mentionerProfile?.avatar_url ?? null,
        post_id: postId,
      });
    } catch (notifErr) {
      console.error('[push-on-mention] Failed to write inapp_notification:', notifErr);
    }

    // Fire-and-forget edge function for device push notification (best effort)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseServiceKey) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-on-mention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ postId, mentionerId, mentionedUserId }),
      }).catch(() => { });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in push-on-mention:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
