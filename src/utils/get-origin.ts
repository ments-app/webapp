import type { NextRequest } from 'next/server';

/**
 * Get the correct public origin from a request, accounting for reverse proxies.
 *
 * Behind a reverse proxy (Nginx, Caddy, etc.), req.url / req.nextUrl may contain
 * the internal hostname (e.g. localhost:3000) instead of the public domain.
 * This utility reads standard proxy headers to reconstruct the real origin.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL env var (most reliable, set once)
 *  2. x-forwarded-host + x-forwarded-proto headers (set by proxy)
 *  3. host header (set by browser / proxy)
 *  4. req.nextUrl.origin (fallback, may be wrong behind proxy)
 */
export function getOrigin(req: NextRequest): string {
  // 1. Env var — always correct if set
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // strip trailing slash
  }

  // 2. Forwarded headers from reverse proxy
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = forwardedProto.split(',')[0].trim();
    return `${proto}://${host}`;
  }

  // 3. Host header (most browsers/proxies send this)
  const host = req.headers.get('host');
  if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    return `${proto}://${host}`;
  }

  // 4. Fallback to Next.js parsed URL
  return req.nextUrl.origin;
}
