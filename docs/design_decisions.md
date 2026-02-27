# Design Decisions — Ments Webapp

## Auth: Supabase + Google OAuth only

- Single sign-on via Google OAuth (no email/password auth)
- Session managed via cookie (`sb-web-auth`), validated in `middleware.ts` on every request
- Two Supabase clients intentionally separated:
  - `createAuthClient()` — user context, RLS enforced
  - `createAdminClient()` — service role, bypasses RLS — only used where user-scoped queries are insufficient (e.g. sending co-founder invitations to non-users)
- Email verification is an additional layer on top of OAuth (6-digit code) for trust building

## Database: Supabase SDK over ORM

- No Prisma/Drizzle — queries written directly using Supabase JS SDK (PostgREST)
- Decision: avoids ORM abstraction overhead, keeps queries explicit and close to SQL
- RLS policies at the DB level are the primary security layer — not application-level guards

## Feed: AI Ranking with Fallback

- Groq LLM ranks candidate posts by relevance to user interest profile
- Full fallback to chronological feed if AI pipeline fails (resilience over feature completeness)
- Feed cached per user to avoid re-running the expensive pipeline on every load
- A/B experiment framework built in — new ranking models can be tested against a control group without a code deploy

## Caching: Simple In-Memory over Redis

- Map-based TTL cache (`lib/cache.ts`) — no Redis dependency
- Tradeoff: cache is per-instance (not shared across serverless instances), acceptable for current scale
- Cache keys prefixed by domain for easy targeted invalidation
- To scale: swap `lib/cache.ts` implementation for Redis without changing call sites

## Storage: Supabase Storage + S3

- User avatars, startup logos/banners, project slides → Supabase Storage
- Larger media / public assets → AWS S3 bucket (`ments-public`)
- Video processed client-side with FFmpeg WASM before upload to reduce server load

## Co-Founder Invitations

- Founders can invite by email (external) or Ments username (internal)
- Invited founders stored in `startup_founders` with `status: pending`
- Pending founders hidden from public startup page — visible only to owner/co-founders
- Invited badge shown on profile when accepted but not yet a Ments user

## PWA

- `next-pwa` adds service worker + offline support
- Enables mobile app-like install on iOS/Android without native app
- Push notifications handled via `/api/push-notification`, `/api/push-on-mention`, `/api/push-on-reply`

## Component Architecture

- No component library (no shadcn, MUI, etc.) — all components built custom
- `class-variance-authority` (CVA) used for variant-based component styling
- Tailwind for all styling — no CSS modules or styled-components
- Framer Motion for animations — used selectively, not globally

## Notifications

- Notifications fetched via POST `/api/notifications` (not GET) — allows sending user context in body rather than query params
- Real-time notification context via `context/NotificationsContext`
- Push notifications sent server-side on mention/reply events
