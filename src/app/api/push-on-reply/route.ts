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

    const { postId, replyId } = await request.json();

    if (!postId || !replyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Derive replierId from the authenticated session, not the request body
    const replierId = user.id;

    const serviceClient = createServiceClient();

    // Verify the reply exists, belongs to the authenticated user, AND is actually a
    // reply to the claimed postId — prevents content spoofing and ownership abuse.
    const { data: replyPost } = await serviceClient
      .from('posts')
      .select('author_id, parent_post_id, content')
      .eq('id', replyId)
      .eq('deleted', false)
      .maybeSingle();

    if (!replyPost || replyPost.author_id !== replierId || replyPost.parent_post_id !== postId) {
      // Reply does not exist, doesn't belong to caller, or isn't a reply to postId
      return NextResponse.json({ success: true }); // silent — no spoofed notification
    }

    // Use DB content — never trust client-supplied content
    const verifiedReplyContent = replyPost.content ?? '';

    // Fetch the original post to get author_id
    const { data: originalPost } = await serviceClient
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .eq('deleted', false)
      .maybeSingle();

    const postAuthorId = originalPost?.author_id ?? null;

    // Write in-app notification directly (primary path — no edge function dependency)
    if (postAuthorId && postAuthorId !== replierId) {
      try {
        // Fetch replier's profile for notification metadata
        const { data: replierProfile } = await serviceClient
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('id', replierId)
          .maybeSingle();

        await serviceClient.from('inapp_notification').insert({
          recipient_id: postAuthorId,
          type: 'reply',
          content: verifiedReplyContent,
          is_read: false,
          actor_id: replierId,
          actor_name: replierProfile?.full_name ?? null,
          actor_username: replierProfile?.username ?? null,
          actor_avatar_url: replierProfile?.avatar_url ?? null,
          post_id: postId,
          reply_id: replyId,
        });
      } catch (notifErr) {
        console.error('[push-on-reply] Failed to write inapp_notification:', notifErr);
      }
    }

    // Fire-and-forget edge function for device push notification (best effort)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseServiceKey) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-on-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ postId, replyId, replierId, replyContent: verifiedReplyContent }),
      }).catch(() => { });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in push-on-reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
