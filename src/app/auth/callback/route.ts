import { createAuthClient } from '@/utils/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Next.js 16: cookies() is async, must await before passing
    const supabase = await createAuthClient();

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError);
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`);
    }

    if (session?.user) {
      // Check if user exists in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      // If user doesn't exist, create a new user record
      if (!existingUser && session.user.email) {
        const emailParts = session.user.email.split('@');
        const baseUsername = emailParts[0];

        let username = baseUsername;
        let counter = 1;
        let isUnique = false;

        while (!isUnique) {
          const { data: usernameCheck } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

          if (!usernameCheck) {
            isUnique = true;
          } else {
            username = `${baseUsername}${counter}`;
            counter++;
          }
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            username: username.toLowerCase(),
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            user_type: 'normal_user',
            is_verified: false,
            is_onboarding_done: false,
            created_at: new Date().toISOString(),
            last_seen: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user:', insertError);
        }
      } else if (existingUser) {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', session.user.id);
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin);
}
