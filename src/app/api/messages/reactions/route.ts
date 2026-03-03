import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/utils/supabase-server';

// GET /api/messages/reactions?conversationId=...
export async function GET(req: NextRequest) {
  const supabase = await createAuthClient();
  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json([], { status: 200 });
  }
  try {
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

    const messageIds = (messages ?? []).map((m: { id: string }) => m.id);
    if (messageIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

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

// POST /api/messages/reactions
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient();
  try {
    // Verify session — always use session user, never trust body user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { message_id, reaction } = body;
    if (!message_id || !reaction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .upsert([{ message_id, user_id: user.id, reaction }], { onConflict: 'user_id,message_id' })
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
  const supabase = await createAuthClient();
  try {
    // Verify session — always use session user, never trust body user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { message_id } = body;
    if (!message_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', message_id)
      .eq('user_id', user.id);   // ← enforce ownership
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
