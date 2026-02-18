# Ments AI Feed Engine

Technical documentation for the AI-powered personalized feed ranking system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works (High-Level)](#how-it-works-high-level)
3. [Ranking Pipeline (Deep Dive)](#ranking-pipeline-deep-dive)
4. [Signal Collection & Event Tracking](#signal-collection--event-tracking)
5. [Content Analysis](#content-analysis)
6. [Caching & Real-Time Injection](#caching--real-time-injection)
7. [A/B Testing Framework](#ab-testing-framework)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [File Structure](#file-structure)
11. [Configuration & Tuning](#configuration--tuning)
12. [Fallback Strategy](#fallback-strategy)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 CLIENT (Next.js)                     │
│                                                     │
│  PersonalizedFeed ──► TrackedPostCard (per post)    │
│       │                    │                        │
│       │               useFeedTracking               │
│       │            (IntersectionObserver)            │
│       │                    │                        │
│  usePersonalizedFeed    FeedEventTracker            │
│       │              (batches 20 events / 10s)      │
└───────┼────────────────────┼────────────────────────┘
        │                    │
   GET /api/feed      POST /api/feed/events
        │                    │
┌───────▼────────────────────▼────────────────────────┐
│              FEED RANKING PIPELINE                   │
│                                                     │
│  1. Candidate Generation ──► 200 posts from DB      │
│  2. Feature Extraction   ──► 19-dim feature vectors │
│  3. Tier 1 Scoring       ──► Deterministic weights  │
│  4. Tier 2 Re-ranking    ──► Groq LLM (top 50)     │
│  5. Diversity Rules      ──► Author/type/freshness  │
│  6. Cache (2hr TTL)      ──► Supabase table         │
│  7. Real-time Injection  ──► New posts into cache   │
└───────┬─────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────┐
│              SUPABASE POSTGRESQL                     │
│                                                     │
│  feed_events          │  user_interest_profiles     │
│  feed_cache           │  content_embeddings         │
│  feed_seen_posts      │  post_features              │
│  user_sessions        │  trending_topics            │
│  user_interaction_graph │  feed_experiments          │
│  feed_experiment_assignments │  feed_analytics_daily │
└─────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Ranking:** TypeScript deterministic scoring + Groq LLM (Llama 3.3 70B)
- **Database:** Supabase PostgreSQL (RPC functions for heavy queries)
- **Cache:** Supabase table with 2-hour TTL (no Redis needed)
- **Client tracking:** IntersectionObserver + batched event flushing
- **Runtime:** Vercel serverless (Next.js API routes)

---

## How It Works (High-Level)

When a user opens their feed:

1. **Check cache** — If a ranked feed was computed in the last 2 hours, serve it immediately. Inject any posts created since the cache was built.

2. **Run full pipeline** (if no cache) — Pull 200 candidate posts, score them across 19 features, re-rank the top 50 with Groq AI, apply diversity rules, cache the result.

3. **Track everything** — Every impression, click, dwell time, like, reply, share, and scroll-past is tracked via IntersectionObserver and batched to the server every 10 seconds.

4. **Learn over time** — User interest profiles are computed from interaction history with time-decay weighting. The more a user interacts, the more personalized their feed becomes.

5. **Fallback gracefully** — If the pipeline fails for any reason, fall back to a simple chronological feed. The user always sees posts.

---

## Ranking Pipeline (Deep Dive)

The pipeline lives in `src/lib/feed/pipeline.ts` and orchestrates 6 stages:

### Stage 1: Candidate Generation

**File:** `src/lib/feed/candidate-generator.ts`

Pulls ~200 candidate posts via Supabase RPC (`get_feed_candidates`):

| Source | Description |
|--------|-------------|
| Following | Posts from users you follow |
| Friends-of-Friends | Posts from 2nd-degree connections |
| Trending | High-engagement posts from anyone |
| Topic matches | Posts matching your interest topics |

Excludes posts you've already seen (`feed_seen_posts` table) and your own posts.

**Fallback:** If the RPC fails, runs a simple query for recent non-deleted root posts ordered by `created_at`.

### Stage 2: Feature Extraction

**File:** `src/lib/feed/feature-extractor.ts`

Builds a **19-dimensional feature vector** for each candidate post:

| Category | Features |
|----------|----------|
| **Engagement** | `engagement_score`, `virality_velocity`, `likes_normalized`, `replies_normalized` |
| **Social** | `is_following`, `is_fof`, `interaction_affinity`, `creator_affinity` |
| **Content** | `topic_overlap_score`, `content_type_preference`, `keyword_match` |
| **Freshness** | `freshness` (exponential decay: `e^(-age_hours / 24)`) |
| **Author** | `is_verified`, `follower_count_normalized` |
| **Richness** | `has_media`, `has_poll`, `content_quality` |

Data sources:
- `post_features` table for engagement/virality/quality scores
- `content_embeddings` table for topic/keyword overlap
- `user_interaction_graph` table for creator affinities
- `user_interest_profiles` for user topic scores and preferences

### Stage 3: Tier 1 — Deterministic Scoring

**File:** `src/lib/feed/scorer.ts`

Applies a weighted linear combination across 10 feature dimensions:

```
score = engagement      × 0.15
      + virality        × 0.10
      + following       × 0.20    ← strongest signal
      + fof             × 0.05
      + interaction     × 0.15
      + creator         × 0.10
      + topic_overlap   × 0.10
      + freshness       × 0.10
      + content_type    × 0.03
      + media           × 0.02
```

This runs on ALL 200 candidates. Fast and deterministic — no API calls.

### Stage 4: Tier 2 — Groq LLM Re-ranking

**File:** `src/lib/feed/groq-ranker.ts`

Takes the **top 50 posts** from Tier 1 and sends them to Groq (Llama 3.3 70B Versatile) for semantic re-ranking.

**What Groq receives:**
- Condensed post summaries (ID, content snippet, tier1 score, age, media flag, verified flag)
- User interest profile (top topics, preferred content types)

**What Groq considers:**
- Interest relevance — does this match what the user cares about?
- Content diversity — avoid repetitive content
- Social signals — following vs. discovery balance
- Freshness tradeoff — mix of fresh and high-quality older posts
- Author deduplication — don't flood with one creator

**What Groq returns:**
- Re-ordered list of post IDs
- Final score = blend of Tier 1 (deterministic) + Tier 2 (LLM position)

**Fallback:** If Groq is unavailable or errors, Tier 1 ordering is used as-is.

**Config:** Temperature 0.2 (conservative), max 2048 tokens.

### Stage 5: Diversity Rules

**File:** `src/lib/feed/reranker.ts`

Hard constraints applied after LLM ranking to ensure feed quality:

| Rule | Constraint |
|------|-----------|
| **Author diversity** | Max 2 posts from same author in top 20 |
| **Type variety** | No more than 3 consecutive posts of same type (text/media/poll) |
| **Freshness guarantee** | At least 30% of top 10 must be from the last 6 hours |
| **New creator boost** | 1.2x score multiplier for accounts < 30 days old |

These rules can be adjusted per A/B experiment variant.

### Stage 6: Cache & Serve

**File:** `src/lib/feed/cache-manager.ts`

The final ranked feed (all scored posts, not just one page) is written to the `feed_cache` table with a 2-hour TTL. Subsequent requests serve from cache with cursor-based pagination (20 posts per page).

---

## Signal Collection & Event Tracking

### Client-Side Tracking

**Files:**
- `src/lib/feed/event-tracker.ts` — Core `FeedEventTracker` class
- `src/hooks/useFeedTracking.ts` — Per-post tracking hook
- `src/hooks/useSessionTracking.ts` — Session lifecycle
- `src/context/FeedTrackingContext.tsx` — React context provider
- `src/components/posts/TrackedPostCard.tsx` — Instrumented post wrapper

### Events Tracked

| Event | Trigger | How |
|-------|---------|-----|
| `impression` | Post 50%+ visible for 500ms+ | IntersectionObserver |
| `dwell` | Post leaves viewport | Timer diff from impression start |
| `scroll_past` | Post visible < 500ms | IntersectionObserver exit |
| `click` | Tap/click on post body | onClick handler |
| `like` / `unlike` | Like button interaction | Callback prop |
| `reply` | Reply submitted | Callback prop |
| `share` | Share/repost action | Callback prop |
| `bookmark` | Bookmark action | Callback prop |
| `poll_vote` | Poll vote cast | Callback prop |
| `profile_click` | Click author avatar/name | Callback prop |
| `expand_content` | Click "Show more" | Callback prop |

### Batching Strategy

Events are buffered client-side and flushed in batches:

- **Buffer size:** 20 events max before auto-flush
- **Timer:** Every 10 seconds
- **Page hide:** Immediate flush via `navigator.sendBeacon()` (reliable on tab close)
- **Retry:** Failed events re-added to buffer (max 60 total)

### Event Weights (for Interest Profile)

Events contribute differently to user interest scores:

```
reply       = 5.0    (strongest positive signal)
share       = 4.0
like        = 3.0
bookmark    = 3.0
poll_vote   = 2.5
click       = 2.0
profile_click = 1.5
expand      = 1.0
dwell       = 0.5
impression  = 0.1    (weakest signal)
scroll_past = 0.0    (neutral)
unlike      = -1.0   (negative signal)
```

### Session Tracking

Each user visit creates a session with:
- Unique session ID (`s_{timestamp}_{random}`)
- Device type detection (mobile/tablet/desktop)
- Heartbeat every 30 seconds
- Auto-end on page hide or 30-minute timeout

---

## Content Analysis

**File:** `src/lib/feed/topic-extractor.ts`

When a post is created, its content is analyzed to extract:
- **3-5 topic tags** (e.g., "technology", "ai", "startups")
- **5-10 keywords** (significant terms from the text)
- **Sentiment score** (-1 to +1)
- **Language** detection

### Extraction Methods

**Primary — Groq LLM** (for posts with 20+ characters):
- Sends content to Llama 3.3 70B
- Structured prompt requesting topics, keywords, sentiment
- Parses JSON response

**Fallback — Keyword Analysis** (if Groq unavailable):
- Tokenizes content, filters 109 common stop words
- Ranks by word frequency
- Maps keywords to predefined topic categories
- Topic triggers: "AI", "startup", "funding", "design", "career", etc.

Results stored in `content_embeddings` table, used by feature extraction for topic overlap scoring.

---

## Caching & Real-Time Injection

### Feed Cache

- **Storage:** `feed_cache` Supabase table
- **TTL:** 2 hours
- **Content:** Full ranked list of post IDs + scores
- **Pagination:** Cursor-based (20 posts per page)
- **Invalidation:** On forced refresh (`POST /api/feed/refresh`) or TTL expiry

### Real-Time Injection

**File:** `src/lib/feed/realtime-injector.ts`

When serving from cache, new posts created *after* the cache was built are:

1. Fetched from the database (up to 10 newest)
2. Feature-extracted and quick-scored (Tier 1 only — no LLM call)
3. Injected at strategic positions in the cached feed: **positions 0, 4, and 9**

This ensures users see fresh content even when the main pipeline hasn't re-run.

### Real-Time Notifications

**File:** `src/hooks/useRealtimeFeedUpdates.ts`

A Supabase Realtime subscription listens for new post inserts. When new posts arrive, a banner appears: **"X new posts"** — clicking it refreshes the feed.

---

## A/B Testing Framework

### How It Works

**File:** `src/lib/feed/experiments.ts`

1. **Create experiment** — Define name, variants (each with weight and config overrides), metrics to track
2. **User bucketing** — Deterministic hash: `hash(experimentId + userId) % 10000`. Same user always gets the same variant.
3. **Variant application** — During pipeline Stage 5 (diversity rules), experiment config modifies ranking weights (e.g., variant A might boost `freshness_weight` by 1.5x)
4. **Metric tagging** — Every feed event is tagged with `experiment_id` + `variant`
5. **Analysis** — Statistical significance via Z-test (proportions) and Welch's t-test (means)

### Statistical Tests

**File:** `src/lib/feed/statistics.ts`

| Test | Use Case | Method |
|------|----------|--------|
| Z-test for proportions | CTR, engagement rate comparison | Pooled proportion, standard error |
| Welch's t-test | Dwell time, session depth comparison | Welch-Satterthwaite degrees of freedom |
| Confidence intervals | Point estimates with bounds | 95%/99%/90% configurable |

Results include: test statistic, p-value, confidence intervals, and `isSignificant` flag (p < 0.05).

### Experiment Lifecycle

```
draft → active → paused → active → ended
         │                            │
         └── started_at set           └── ended_at set
```

---

## Database Schema

### 12 Tables

| Table | Purpose |
|-------|---------|
| `feed_events` | Raw event log (impressions, clicks, dwell, likes, etc.) |
| `user_sessions` | Session lifecycle tracking |
| `feed_seen_posts` | Posts each user has already seen |
| `content_embeddings` | AI-extracted topics, keywords, sentiment per post |
| `post_features` | Pre-computed engagement scores, virality, quality |
| `user_interest_profiles` | Aggregated user interests (topics, creators, patterns) |
| `user_interaction_graph` | Pairwise user-to-user interaction frequency |
| `trending_topics` | Detected trending topics with velocity |
| `feed_cache` | Pre-computed personalized feeds (2hr TTL) |
| `feed_experiments` | A/B test experiment definitions |
| `feed_experiment_assignments` | User-to-variant mapping |
| `feed_analytics_daily` | Aggregated daily metrics |

### 5 RPC Functions

| Function | Purpose |
|----------|---------|
| `get_feed_candidates` | Pull candidate posts (following + FOF + trending + topic matches) |
| `batch_insert_feed_events` | Atomic bulk event insertion |
| `compute_user_interest_profile` | Aggregate events into interest profiles with time-decay |
| `compute_post_features` | Calculate engagement score, virality, CTR for a post |
| `update_interaction_graph` | Incremental affinity update between two users |

---

## API Endpoints

### `GET /api/feed`

Main feed endpoint. Returns ranked, paginated posts.

**Query params:**
- `cursor` (optional) — Last post ID for pagination
- `offset` (optional) — Offset for chronological fallback

**Response:**
```json
{
  "posts": [...],
  "cursor": "post-uuid-or-null",
  "has_more": true,
  "source": "cache | pipeline | chronological",
  "experiment_id": "uuid-or-null",
  "variant": "string-or-null"
}
```

### `POST /api/feed/refresh`

Force re-computation of the user's feed. Clears cache and interest profile, re-runs full pipeline.

**Response:**
```json
{
  "ok": true,
  "source": "pipeline",
  "post_count": 100
}
```

### `POST /api/feed/events`

Batch insert feed events and/or manage sessions.

**Request body:**
```json
{
  "events": [
    {
      "user_id": "uuid",
      "session_id": "s_...",
      "post_id": "uuid",
      "author_id": "uuid",
      "event_type": "impression",
      "metadata": { "dwell_ms": 3200 },
      "position_in_feed": 0,
      "experiment_id": null,
      "variant": null
    }
  ],
  "session": {
    "id": "s_...",
    "user_id": "uuid",
    "action": "start | heartbeat | end",
    "device_type": "mobile"
  }
}
```

### `POST /api/feed/extract-topics`

Extract topics and keywords from a post's content (called after post creation).

**Request body:**
```json
{
  "post_id": "uuid",
  "content": "Post text here...",
  "post_type": "text"
}
```

### `GET /api/feed/experiments`

List all A/B experiments.

### `POST /api/feed/experiments`

Create a new A/B experiment with variants and metrics.

---

## File Structure

```
src/lib/feed/
├── types.ts                 # All TypeScript interfaces
├── constants.ts             # Ranking weights, TTLs, thresholds
├── pipeline.ts              # Main orchestrator (cache → pipeline → fallback)
├── candidate-generator.ts   # Stage 1: Pull 200 candidate posts
├── feature-extractor.ts     # Stage 2: Build 19-dim feature vectors
├── scorer.ts                # Stage 3: Deterministic Tier 1 scoring
├── groq-ranker.ts           # Stage 4: Groq LLM Tier 2 re-ranking
├── reranker.ts              # Stage 5: Diversity rules
├── cache-manager.ts         # Stage 6: Feed cache (read/write/invalidate)
├── realtime-injector.ts     # Inject new posts into cached feeds
├── interest-profile.ts      # User interest profile management
├── topic-extractor.ts       # Groq/fallback topic extraction
├── event-tracker.ts         # Client-side FeedEventTracker class
├── experiments.ts           # A/B experiment assignment & management
└── statistics.ts            # Z-test, Welch's t-test, confidence intervals

src/hooks/
├── usePersonalizedFeed.ts       # Fetch ranked feed with pagination
├── useFeedTracking.ts           # Per-post IntersectionObserver tracking
├── useSessionTracking.ts        # Session lifecycle management
└── useRealtimeFeedUpdates.ts    # Supabase Realtime new post detection

src/context/
└── FeedTrackingContext.tsx       # React context for event tracker

src/components/feed/
├── PersonalizedFeed.tsx         # Main feed component
├── NewPostsNotifier.tsx         # "X new posts" banner
├── FeedSuggestions.tsx          # Suggested users widget
└── TrendingPosts.tsx            # Trending posts widget

src/components/posts/
└── TrackedPostCard.tsx          # PostCard wrapper with event tracking

src/app/api/feed/
├── route.ts                     # GET: serve personalized feed
├── refresh/route.ts             # POST: force feed recomputation
├── events/route.ts              # POST: batch event ingestion
├── extract-topics/route.ts      # POST: content topic extraction
└── experiments/route.ts         # GET/POST: experiment management
```

---

## Configuration & Tuning

All configurable values live in `src/lib/feed/constants.ts`:

### Ranking Weights (Tier 1)

| Weight | Default | Description |
|--------|---------|-------------|
| `following` | 0.20 | Posts from users you follow |
| `engagement` | 0.15 | Post engagement score |
| `interaction_affinity` | 0.15 | How much you interact with this creator |
| `virality` | 0.10 | Post virality velocity |
| `creator_affinity` | 0.10 | Creator affinity from profile |
| `topic_overlap` | 0.10 | Topic match with your interests |
| `freshness` | 0.10 | Exponential time decay |
| `fof` | 0.05 | Friends-of-friends signal |
| `content_type` | 0.03 | Content type preference match |
| `media` | 0.02 | Has media bonus |

### Pipeline Config

| Parameter | Value | Description |
|-----------|-------|-------------|
| `CANDIDATE_POOL_SIZE` | 200 | Posts pulled for ranking |
| `LLM_RERANK_TOP_N` | 50 | Posts sent to Groq |
| `FEED_PAGE_SIZE` | 20 | Posts per page |
| `CACHE_TTL_MS` | 7,200,000 | 2-hour cache lifetime |
| `FRESHNESS_DECAY_HALF_LIFE_HOURS` | 24 | Freshness decay rate |
| `GROQ_MODEL` | llama-3.3-70b-versatile | LLM model for re-ranking |

### Tracking Config

| Parameter | Value | Description |
|-----------|-------|-------------|
| `IMPRESSION_VISIBILITY_THRESHOLD` | 0.50 | 50% visible to count |
| `IMPRESSION_MIN_DWELL_MS` | 500 | Min time for impression |
| `SESSION_HEARTBEAT_INTERVAL_MS` | 30,000 | Session heartbeat |
| `SESSION_TIMEOUT_MS` | 1,800,000 | 30-min session timeout |
| Event batch size | 20 | Max events before flush |
| Event flush interval | 10,000ms | Auto-flush timer |

---

## Fallback Strategy

The system is designed to **never fail visibly**. Every component has a fallback:

```
Pipeline Path:
  Groq LLM available?
    ├── Yes → Full 2-tier ranking (AI-powered)
    └── No  → Tier 1 deterministic scoring only

  RPC get_feed_candidates works?
    ├── Yes → Smart candidate selection
    └── No  → Simple chronological query (fallback)

  Pipeline returns posts?
    ├── Yes → Serve ranked feed
    └── No  → Serve chronological feed

  Topic extraction via Groq?
    ├── Yes → LLM-extracted topics + keywords
    └── No  → Keyword frequency analysis (fallback)

  Interest profile available?
    ├── Yes → Personalized feature scoring
    └── No  → Generic scoring (no personalization)

  Cache available?
    ├── Yes → Serve from cache + inject real-time posts
    └── No  → Run full pipeline
```

Every pipeline stage is wrapped in try/catch. If any stage fails, the system degrades gracefully rather than showing an error.
