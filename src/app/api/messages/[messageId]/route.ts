import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';
import type { Message, SendMessageResponse } from '@/types/messaging';

async function getOwnedMessage(messageId: string) {
  const supabase = await createAuthClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, message: null as Record<string, unknown> | null };
  }

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .maybeSingle();

  if (messageError || !message || message.sender_id !== user.id) {
    return { supabase, user, message: null as Record<string, unknown> | null };
  }

  return { supabase, user, message };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    const { content } = await req.json();

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const { supabase, user, message } = await getOwnedMessage(messageId);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 403 });
    }

    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ content: content.trim() })
      .eq('id', messageId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Database error' }, { status: 500 });
    }

    const [senderRes, replyToRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url, is_verified')
        .eq('id', user.id)
        .single(),
      updatedMessage.reply_to_id
        ? supabase
          .from('messages')
          .select('id, content, sender_id, created_at')
          .eq('id', updatedMessage.reply_to_id)
          .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const response: SendMessageResponse = {
      message: {
        ...updatedMessage,
        sender: senderRes.data || null,
        reply_to: replyToRes.data || null,
      } as Message,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    const { supabase, user, message } = await getOwnedMessage(messageId);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 403 });
    }

    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId);

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
