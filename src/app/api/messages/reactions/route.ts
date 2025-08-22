import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/messages/reactions?conversationId=...
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json([], { status: 200 }); // Return empty array if no conversationId
  }
  try {
    // Get all message IDs for this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

    const messageIds = (messages ?? []).map((m: { id: string }) => m.id);
    if (messageIds.length === 0) {
      return NextResponse.json([], { status: 200 }); // No messages, so no reactions
    }

    // Get all reactions for those message IDs
    const { data: reactions, error: reactError } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (reactError) return NextResponse.json({ error: reactError.message }, { status: 500 });

    return NextResponse.json(reactions || []);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ReactionBody interface for type safety
interface ReactionBody {
  message_id: string;
  user_id: string;
  reaction: string;
}

// POST /api/messages/reactions
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReactionBody;
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
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/messages/reactions
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as ReactionBody;
    const { message_id, user_id } = body;
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
