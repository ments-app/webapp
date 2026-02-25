import { createAuthClient } from '@/utils/supabase-server';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[AUTH CALLBACK] Hit callback route');
  console.log('[AUTH CALLBACK] Code present:', !!code, '| Error:', error, '| Desc:', errorDescription);

  // Handle errors returned by Supabase (e.g. failed external code exchange)
  if (error) {
    console.error('[AUTH CALLBACK] Supabase returned error:', error, errorDescription);
    return NextResponse.redirect(`${requestUrl.origin}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`);
  }

  if (code) {
    // Next.js 16: cookies() is async, must await before passing
    const supabase = await createAuthClient();

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    console.log('[AUTH CALLBACK] Exchange result - session:', !!session, 'error:', sessionError?.message);

    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError);
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`);
    }

    if (session?.user) {
      // Check if user exists in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('email', session.user.email)
        .single();

      // If user doesn't exist, create a new user record
      if (!existingUser && session.user.email) {
        const emailParts = session.user.email.split('@');
        const baseUsername = emailParts[0];

        let username = baseUsername;
        let counter = 1;
        let isUnique = false;
        const MAX_ATTEMPTS = 20;

        while (!isUnique && counter <= MAX_ATTEMPTS) {
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

        if (!isUnique) {
          // Fallback: append random suffix
          username = `${baseUsername}_${Date.now().toString(36).slice(-5)}`;
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
