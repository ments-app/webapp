# Architecture Overview — Ments Webapp

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5 |
| UI | React 19.2.3 |
| Styling | Tailwind CSS 3.4.1 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (Google OAuth) |
| AI/LLM | Groq SDK (feed ranking, topic extraction) |
| Storage | Supabase Storage + AWS S3 (`ments-public`) |
| Email | Nodemailer + Supabase Edge Functions |
| Animations | Framer Motion 12.15.0 |
| PWA | next-pwa 5.6.0 |
| Build | Standalone output, Turbopack dev server |

---

## Directory Structure

```
src/
├── app/
│   ├── api/               # 28 API route groups (see api_spec.yaml)
│   ├── auth/              # OAuth callback handling
│   ├── hub/               # Feed/home page
│   ├── messages/          # Messaging UI
│   ├── profile/           # User profiles
│   ├── startups/          # Startup directory & profiles
│   └── layout.tsx         # Root layout with AuthProvider
├── api/                   # Business logic helpers (non-route)
│   ├── posts.ts
│   ├── startups.ts
│   └── projects.ts
├── components/            # 16 component directories
├── context/               # React Contexts: Auth, Notifications, Conversations, Theme
├── lib/
│   ├── feed/              # AI feed engine (12 modules)
│   └── cache.ts           # In-memory TTL cache
├── hooks/                 # Custom React hooks
├── utils/                 # Supabase clients, image processing, notifications
├── types/                 # TypeScript definitions
└── middleware.ts           # Auth middleware (session validation per request)
```

---

## Authentication Flow

1. User signs in via Google OAuth → Supabase Auth
2. `middleware.ts` intercepts every request, validates session cookie (`sb-web-auth`)
3. Two Supabase clients used throughout:
   - `createAuthClient()` — user-scoped, respects RLS policies
   - `createAdminClient()` — service role, bypasses RLS (used sparingly)
4. Unauthenticated users redirected to `/auth`

---

## AI Feed Engine (`src/lib/feed/`)

Multi-stage pipeline with automatic fallback:

```
1. Candidate Generation  →  fetch posts based on user interest profile
2. AI Ranking            →  Groq LLM scores posts by relevance
3. Cache Storage         →  result stored per user (15–30 min TTL)
4. Fallback              →  chronological feed if pipeline fails
```

Supporting systems:
- **Event Tracking** — impressions, clicks, dwell time, likes stored in `feed_events`
- **Interest Profiles** — aggregated per user in `user_interest_profiles`
- **A/B Testing** — experiment framework with variant assignment (`feed_experiments`, `feed_experiment_assignments`)

---

## Caching Strategy

- Simple Map-based in-memory cache with TTL (`lib/cache.ts`)
- Cache keys are prefixed by domain (e.g., `startups:limit=20&offset=0`)
- Cache invalidated on create/update operations
- `Cache-Control` headers set per route based on freshness requirements
- `/api/cache/clear` endpoint for manual invalidation by prefix

---

## Database

- PostgreSQL via Supabase (PostgREST + JS SDK — no ORM)
- Migrations in `supabase/migrations/` (8 SQL files)
- RLS enabled on all sensitive tables
- Key table groups:
  - **Feed**: `feed_events`, `feed_cache`, `user_interest_profiles`, `trending_topics`, etc.
  - **Social**: `users`, `posts`, `post_likes`, `messages`, `conversations`
  - **Startups**: `startup_profiles`, `startup_founders`
  - **Content**: `events`, `competitions`, `resources`, `applications`
