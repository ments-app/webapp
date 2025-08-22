import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: List all conversations for a user (userId as query param)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  // Find conversations where user is either user1 or user2
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST: Create a new conversation (with user1_id, user2_id)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user1_id, user2_id } = body;
  if (!user1_id || !user2_id) {
    return NextResponse.json({ error: 'Missing user1_id or user2_id' }, { status: 400 });
  }
  // Enforce different users
  if (user1_id === user2_id) {
    return NextResponse.json({ error: 'Cannot create conversation with self' }, { status: 400 });
  }
  // Check if conversation already exists (unique pair)
  const { data: existing, error: existError } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .maybeSingle();
  if (existError) {
    return NextResponse.json({ error: existError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ error: 'Conversation already exists', id: existing.id }, { status: 409 });
  }
  // Insert new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user1_id, user2_id }])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PATCH: Update conversation (e.g., last_message, status)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, last_message, status } = body;
  if (!id) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
  }
  const updates: Partial<{ last_message: string; status: string | number; updated_at: string }> = {
    updated_at: new Date().toISOString(),
  };
  if (last_message !== undefined) updates.last_message = last_message;
  if (status !== undefined) updates.status = status;
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE: Remove a conversation by id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
  }
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
