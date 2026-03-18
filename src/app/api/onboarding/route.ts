import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createAdminClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_INTERESTS = ['exploring', 'building', 'investing', 'hiring'] as const;
type Interest = typeof VALID_INTERESTS[number];

const INTEREST_TO_PRIMARY: Record<Interest, string> = {
  exploring: 'exploring',
  building: 'building',
  investing: 'investing',
  hiring: 'exploring',
};

/**
 * Sanitize an email prefix into a valid username.
 * Rules: 3-20 chars, starts with lowercase letter, only [a-z0-9_], no consecutive underscores.
 */
function sanitizeUsername(email: string): string {
  let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

  // Must start with a letter — strip leading non-letter chars
  base = base.replace(/^[^a-z]+/, '');

  // Remove consecutive underscores
  base = base.replace(/_+/g, '_');

  // Ensure minimum length
  if (base.length < 3) {
    base = 'user_' + Math.random().toString(36).slice(2, 7);
  }

  // Trim to max length
  return base.slice(0, 20);
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { interests } = body as { interests: string[] };

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one interest' },
        { status: 400 }
      );
    }

    const validInterests = interests.filter((i): i is Interest =>
      VALID_INTERESTS.includes(i as Interest)
    );

    if (validInterests.length === 0) {
      return NextResponse.json(
        { error: 'Invalid interests provided' },
        { status: 400 }
      );
    }

    const primaryInterest = INTEREST_TO_PRIMARY[validInterests[0]];

    const admin = createAdminClient();

    // Check if user row already exists
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // Row exists — update interests only, don't mark onboarding done yet (username step still pending)
      const { error: updateError } = await admin
        .from('users')
        .update({
          user_type: 'normal_user',
          primary_interest: primaryInterest,
        })
        .eq('id', user.id);

      if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('does not exist') || updateError.message?.includes('schema cache'))) {
        const { error: fallbackError } = await admin
          .from('users')
          .update({
            user_type: 'normal_user',
          })
          .eq('id', user.id);

        if (fallbackError) {
          console.error('Error updating user onboarding (fallback):', fallbackError);
          return NextResponse.json({ error: `Failed to update user: ${fallbackError.message}` }, { status: 500 });
        }
      } else if (updateError) {
        console.error('Error updating user onboarding:', updateError);
        return NextResponse.json({ error: `Failed to update user: ${updateError.message} (code: ${updateError.code})` }, { status: 500 });
      }
    } else {
      // No row yet (new signup) — create with a sanitized email-derived username
      const username = sanitizeUsername(user.email || 'user');

      const { error: insertError } = await admin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          user_type: 'normal_user',
          primary_interest: primaryInterest,
          account_status: 'active',
          is_verified: false,
          is_onboarding_done: false,
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating user during onboarding:', insertError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      redirect: '/onboarding/username',
    });
  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
