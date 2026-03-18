import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createAdminClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const CONSECUTIVE_UNDERSCORES = /__/;
const RESERVED_USERNAMES = new Set([
  'admin', 'ments', 'support', 'help', 'mod', 'moderator',
  'system', 'official', 'team', 'staff', 'root', 'null',
  'undefined', 'api', 'www', 'mail', 'email', 'test',
]);

function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!USERNAME_REGEX.test(username)) {
    if (!/^[a-z]/.test(username)) return 'Username must start with a letter';
    return 'Only lowercase letters, numbers, and underscores allowed';
  }
  if (CONSECUTIVE_UNDERSCORES.test(username)) return 'No consecutive underscores allowed';
  if (RESERVED_USERNAMES.has(username)) return 'This username is reserved';
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const username = (body.username ?? '').trim().toLowerCase();

    const validationError = validateUsername(username);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check availability (exclude current user in case row already exists)
    const { data: taken } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .single();

    if (taken) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    // Check if user row already exists in DB
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // Row exists — update username and mark onboarding complete
      const { error: updateError } = await admin
        .from('users')
        .update({ username, is_onboarding_done: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating username:', updateError);
        return NextResponse.json({ error: 'Failed to update username' }, { status: 500 });
      }
    } else {
      // No row yet (edge case — interests step was skipped) — create the user record now
      const { error: insertError } = await admin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          user_type: 'normal_user',
          account_status: 'active',
          is_verified: false,
          is_onboarding_done: true,
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Error in username API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
