import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────
   Lightweight in-memory rate limiter for API routes.
   Tracks request counts per IP in a sliding window.
   NOTE: This works per-instance. For multi-instance
   deployments, upgrade to Redis-based rate limiting
   (e.g., @upstash/ratelimit).
   ────────────────────────────────────────────────── */
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 120; // max requests per window per IP

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup of expired entries (every 2 min)
let rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureRateLimitCleanup() {
  if (rateLimitCleanupTimer) return;
  rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(key);
    }
    if (rateLimitStore.size === 0 && rateLimitCleanupTimer) {
      clearInterval(rateLimitCleanupTimer);
      rateLimitCleanupTimer = null;
    }
  }, 120_000);
  if (rateLimitCleanupTimer && typeof rateLimitCleanupTimer === 'object' && 'unref' in rateLimitCleanupTimer) {
    rateLimitCleanupTimer.unref();
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    // New window
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    ensureRateLimitCleanup();
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function middleware(req: NextRequest) {
  // Rate limit API routes only
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-web-auth',
      },
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Use getSession() for middleware — it validates the JWT locally without a network
    // call, which is critical since middleware runs on EVERY request. Sensitive operations
    // in API routes still use getUser() for full server-side verification.
    const { data: { session }, error } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (error && !error.message?.includes('Auth session missing')) {
      console.error('Middleware auth error:', error.message);
    }

    // ── Protected Page Guard ──────────────────────────────
    // Redirect unauthenticated users away from pages that require login
    const PROTECTED_PREFIXES = ['/messages', '/settings', '/create', '/profile/edit', '/startups', '/search', '/hub', '/posts'];
    const pathname = req.nextUrl.pathname;
    const isProtectedPage = PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));

    if (isProtectedPage && !user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user) {
      supabaseResponse.headers.set('x-user-id', user.id);

      // ── Account Status Guard ──────────────────────────────
      // For page navigations (not API/static/auth/reactivate),
      // verify the user's account is active.
      const isGuardedPage = !pathname.startsWith('/api/') &&
        !pathname.startsWith('/_next/') &&
        !pathname.startsWith('/auth/') &&
        pathname !== '/reactivate' &&
        pathname !== '/sw.js' &&
        pathname !== '/manifest.json';

      if (isGuardedPage) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('account_status')
            .eq('id', user.id)
            .single();

          if (profile && profile.account_status === 'deactivated') {
            // Redirect to reactivation page — don't sign out
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = '/reactivate';
            redirectUrl.search = '';
            return NextResponse.redirect(redirectUrl);
          }

          if (profile && (profile.account_status === 'deleted' || profile.account_status === 'suspended')) {
            // Sign out and let the page load normally (no redirect loop)
            await supabase.auth.signOut();
          }
        } catch {
          // If the query fails, allow the request through
        }
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
