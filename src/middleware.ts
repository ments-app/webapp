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
    // Use getSession() instead of getUser() to avoid a network call to
    // Supabase Auth on every request. getSession() validates the JWT locally,
    // which is dramatically faster — critical at scale (10K+ users).
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error && !error.message?.includes('Auth session missing')) {
      console.error('Middleware auth error:', error.message);
    }

    if (session?.user) {
      supabaseResponse.headers.set('x-user-id', session.user.id);
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
