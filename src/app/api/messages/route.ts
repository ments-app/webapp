import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/messages
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Default: /api/messages main handler
  const { searchParams } = url;
  const userId = searchParams.get('userId');
  const conversationId = searchParams.get('conversationId');

  // If conversationId is provided, fetch all messages for that conversation
  if (conversationId) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(messages);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Otherwise, list all conversations for the user
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  try {
    const { data: conversations, error } = await supabase
      .from('chat_conversations_view')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(conversations);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  // Always return JSON if no branch matched in GET
  return NextResponse.json({ error: 'Invalid endpoint or missing parameters' }, { status: 404 });
}

// DELETE /api/messages/reactions - remove a reaction
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/reactions')) {
    try {
      const { message_id, user_id } = await req.json();
      if (!message_id || !user_id) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', message_id)
        .eq('user_id', user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

// POST /api/messages - create a new message
export async function POST(req: NextRequest) {
  // Handle reactions: POST /api/messages/reactions
  const url = new URL(req.url);
  if (url.pathname.endsWith('/reactions')) {
    try {
      const body = await req.json();
      const { message_id, user_id, reaction } = body;
      if (!message_id || !user_id || !reaction) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      // Upsert (unique_user_message_reaction)
      const { data, error } = await supabase
        .from('message_reactions')
        .upsert([{ message_id, user_id, reaction }], { onConflict: 'user_id,message_id' })
        .select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data && data[0] ? data[0] : null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const body = await req.json();
    const {
      conversation_id,
      sender_id,
      content,
      reply_to_id = null,
      is_read = false
    } = body;

    if (!conversation_id || !sender_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id,
          sender_id,
          content,
          reply_to_id,
          is_read,
        },
      ])
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
