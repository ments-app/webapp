# Ments — UX & User Flow Documentation

## Table of Contents
1. [Navigation Structure](#navigation-structure)
2. [Page Routes](#page-routes)
3. [Core User Flows](#core-user-flows)
4. [Feature Breakdown](#feature-breakdown)
5. [Layout Architecture](#layout-architecture)
6. [API Routes](#api-routes)
7. [Responsive Design](#responsive-design)

---

## Navigation Structure

### Desktop Sidebar

```
┌─────────────────────────┐
│  🟢 Ments (Logo)        │
│                         │
│  ── Main Nav ──         │
│  🏠 Home          /     │
│  🔍 Search        /search│
│  💬 Messages      /messages (badge)│
│  🚀 Startups      /startups│
│  🔗 Hub           /hub  │
│  👤 Profile       /profile/[user]│
│                         │
│  ── Bottom ──           │
│  [Avatar] Full Name     │
│     └─ Dropdown:        │
│        View Profile     │
│        Settings         │
│        Sign Out         │
└─────────────────────────┘
```

### Mobile Bottom Navigation

```
┌──────────────────────────────────────────┐
│ Home │ Search │ Messages │ Startups │ Hub │ [Avatar] │
│  🏠  │  🔍   │   💬    │   🚀    │  🔗  │  👤     │
└──────────────────────────────────────────┘
```

### Header (Desktop)

```
┌──────────────────────────────────────────────────┐
│  [Logo]                          [🔔 Notif] [⚙️] │
└──────────────────────────────────────────────────┘
```

### Right Sidebar Widgets (XL+ screens, home page only)

```
┌─────────────────────────┐
│  Communities             │
│  ├─ Community 1          │
│  ├─ Community 2          │
│  └─ ... (up to 12)      │
│  [View all →]            │
├─────────────────────────┤
│  Recent Activity         │
│  ├─ ❤️ X liked your post │
│  ├─ 💬 Y replied         │
│  └─ 👤 Z followed you   │
│  [View all →]            │
├─────────────────────────┤
│  People to Connect       │
│  ├─ [Avatar] Name [Follow]│
│  ├─ [Avatar] Name [Follow]│
│  └─ ...                  │
│  [View all →]            │
└─────────────────────────┘
```

---

## Page Routes

### Home & Feed
| Route | Description |
|-------|-------------|
| `/` | Home feed — authenticated users see PersonalizedFeed + FAB; unauthenticated see login page with social proof |
| `/create` | Standalone create post page (also accessible via FAB modal on home) |
| `/trending` | Trending posts page with engagement-based algorithm |
| `/posts` | All posts feed |
| `/post/[postId]` | Individual post view with reply thread |

### Search & Discovery
| Route | Description |
|-------|-------------|
| `/search` | Global search with tabs: People, Posts, Competitions, Jobs, Gigs |
| `/people` | People discovery page |

### Messaging
| Route | Description |
|-------|-------------|
| `/messages` | Conversations list |
| `/messages/[conversationId]` | Individual conversation thread |

### Startups
| Route | Description |
|-------|-------------|
| `/startups` | Discover startups (search, filters by stage & raising status) |
| `/startups/create` | Create new startup |
| `/startups/[id]` | Startup profile page |
| `/startups/[id]/edit` | Edit startup details |
| `/startups/my` | User's own startups |

### Hub (Events, Jobs, Resources)
| Route | Description |
|-------|-------------|
| `/hub` | Hub homepage with tabs: Events, Jobs & Gigs, Resources |
| `/hub/[id]` | Competition/Event detail |
| `/hub/event/[id]` | Event detail page |
| `/hub/job/[id]` | Job listing detail |
| `/hub/job/[id]/apply` | Job application |
| `/hub/gig/[id]` | Gig listing detail |
| `/hub/gig/[id]/apply` | Gig application |
| `/hub/resource/[id]` | Resource detail page |

### Profile
| Route | Description |
|-------|-------------|
| `/profile` | Own profile redirect |
| `/profile/[username]` | Public profile (tabs: About, Posts, Replies) |
| `/profile/[username]/followers` | Follower list |
| `/profile/[username]/following` | Following list |
| `/profile/[username]/projects` | Projects showcase |
| `/profile/[username]/projects/[id]` | Project detail |
| `/profile/[username]/projects/[id]/edit` | Edit project |
| `/profile/[username]/portfolios` | Portfolio items |
| `/profile/[username]/portfolios/create` | Create portfolio |
| `/profile/[username]/portfolios/edit` | Edit portfolio |
| `/profile/[username]/experiences` | Work experience list |
| `/profile/[username]/experiences/create` | Add experience |
| `/profile/[username]/experiences/[id]/edit` | Edit experience |
| `/profile/[username]/education` | Education list |
| `/profile/[username]/education/create` | Add education |
| `/profile/[username]/education/[id]/edit` | Edit education |
| `/profile/edit` | Edit profile settings |

### Other
| Route | Description |
|-------|-------------|
| `/environments` | Browse all communities |
| `/environments/[id]` | Community detail page |
| `/notifications` | Notification center (tabs: All, Follows, Replies, Mentions) |
| `/settings` | Settings (Appearance, Notifications, Privacy, Data) |

---

## Core User Flows

### 1. Authentication

```
Landing Page (unauthenticated)
│
├─ Social proof: "500+ builders, 50+ startups, 1K+ projects"
│
└─ [Sign in with Google] ──→ Google OAuth
                              │
                              ├─ New user ──→ Profile setup
                              │
                              └─ Existing user ──→ Home Feed
```

### 2. Creating a Post

```
Home Feed
│
├─ Click FAB (+) button (bottom-right corner)
│   │
│   └─ Modal opens
│       │
│       ├─ [Avatar] [Environment Dropdown ▼]
│       │               └─ Searchable list of joined communities
│       │
│       ├─ Textarea: "What's on your mind?"
│       │   └─ Type @ → MentionDropdown appears
│       │       └─ Search users → Select → @mention inserted
│       │
│       ├─ Bottom Toolbar: "Add to your post"
│       │   ├─ 📷 Photo/Video (green) → File picker → Auto-compress
│       │   │   └─ Preview grid with hover tooltips
│       │   │       └─ Click preview → Fullscreen viewer (zoom, pan, swipe)
│       │   │
│       │   ├─ 🎥 Video (blue) → File picker → Auto-compress
│       │   │
│       │   └─ 📊 Poll (amber) → Poll editor
│       │       ├─ Question input (200 chars max)
│       │       ├─ Option inputs (2-6 options)
│       │       └─ Add/remove option buttons
│       │
│       ├─ Character count: X/500
│       │
│       └─ [Post] button → Publish → Modal closes → Feed refreshes
│
└─ Alternative: Navigate to /create for full-page experience
```

### 3. Discovering People

```
Search (/search)
│
├─ Empty state shows:
│   ├─ Recommended People (4 cards, expandable)
│   ├─ Trending Posts (3 posts, expandable)
│   ├─ Recommended Jobs (4 listings)
│   └─ Recommended Gigs (4 listings)
│
├─ Type query → Debounce (350ms) → Results
│   │
│   └─ Tab results:
│       ├─ People → User cards with [Follow] button
│       ├─ Posts → Post previews
│       ├─ Competitions → Competition cards
│       ├─ Jobs → Job listings
│       └─ Gigs → Gig listings
│
└─ Click user → Profile page (/profile/[username])
    │
    ├─ [Follow] → API call → Following state
    └─ [Message] → Opens conversation
```

### 4. Exploring Startups

```
Startups (/startups)
│
├─ Search bar (debounced)
├─ Filters: Stage (seed, series-a, ...) | Raising (yes/no)
│
├─ Grid of startup cards
│   └─ Card: Logo, Name, Stage badge, Funding info
│       └─ Click → Startup profile (/startups/[id])
│           ├─ Team / Founders
│           ├─ Funding details
│           ├─ Description
│           └─ [Bookmark] button
│
└─ [+ Create Startup] → /startups/create
    ├─ Name, Description, Logo
    ├─ Stage, Industry, Location
    ├─ Funding info
    └─ Submit → Created
```

### 5. Using the Hub

```
Hub (/hub)
│
├─ Tab: Events
│   ├─ Featured competition carousel (swipeable)
│   │   └─ [Join] → Competition entry
│   │
│   ├─ Category filters: All | Competitions | Events | Meetups | Workshops
│   │
│   └─ Event cards
│       ├─ Competitions: Prize pool, deadline, participant count
│       │   └─ Click → /hub/[id] → Join / View entries
│       │
│       └─ Events: Date, location, type
│           └─ Click → /hub/event/[id] → RSVP / External link
│
├─ Tab: Jobs & Gigs
│   ├─ Jobs: Company, type, location, salary, deadline
│   │   └─ Click → /hub/job/[id] → [Apply] → /hub/job/[id]/apply
│   │
│   └─ Gigs: Budget, duration, skills required
│       └─ Click → /hub/gig/[id] → [Apply] → /hub/gig/[id]/apply
│
└─ Tab: Resources
    ├─ AI Recommendations (personalized with reason)
    ├─ Categories: Accelerators | Company Offers | Tools | Bank Offers | Schemes
    └─ Resource cards: Provider, description, tags, deadline
        └─ Click → /hub/resource/[id] → Details / External link
```

### 6. Managing Profile

```
Profile (/profile/[username])
│
├─ Header
│   ├─ Cover banner (click to edit on own profile)
│   ├─ Avatar (click to edit)
│   ├─ Full name + Verified badge
│   ├─ @username + Tagline
│   ├─ Location
│   └─ Stats: Followers | Following | Projects | Portfolios | Startups
│
├─ Actions
│   ├─ Own profile: [Edit Profile]
│   └─ Other profile: [Follow/Unfollow] [Message]
│
├─ Tab: About
│   ├─ Bio text
│   ├─ Skills (tag chips)
│   ├─ Work Experience
│   │   └─ Company, position, dates, description
│   └─ Education
│       └─ School, degree, dates
│
├─ Tab: Posts
│   └─ User's posts feed
│
└─ Tab: Replies
    └─ User's replies to other posts
```

### 7. Notifications

```
Notifications (/notifications)
│
├─ Header: [Mark all as read]
│
├─ Tabs: All | Follows | Replies | Mentions
│
└─ Notification items
    ├─ 👤 Follow: "[User] started following you" → Click → Profile
    ├─ 💬 Reply: "[User] replied to your post" → Click → Post
    ├─ @  Mention: "[User] mentioned you" → Click → Post
    └─ ❤️ Like: "[User] liked your post" → Click → Post
    │
    └─ Each shows: Actor avatar, action text, timestamp, unread dot
```

---

## Feature Breakdown

### Home Feed
- **Personalized algorithm** — ranks posts by relevance, recency, engagement
- **Floating Action Button** — persistent create post entry point
- **Modal post creation** — no page navigation needed
- **Feed refresh** — automatic after posting via React key mechanism
- **New posts notifier** — real-time banner when new posts arrive
- **Suggested users** — horizontal scrollable cards with follow buttons
- **Trending posts** — engagement-ranked post highlights

### Search
- **Multi-type search** — single query searches across People, Posts, Competitions, Jobs, Gigs
- **Real-time debouncing** — 350ms delay for smooth UX
- **Empty state recommendations** — suggested people, trending posts, jobs, gigs shown before search
- **Result highlighting** — matching query text highlighted in results

### Messages
- **Real-time messaging** — powered by Supabase Realtime subscriptions
- **Unread badges** — count shown in sidebar and mobile nav
- **Conversation threads** — organized by participant
- **Message reactions** — react to individual messages

### Startups
- **Discovery** — search + filter by stage and raising status
- **Startup profiles** — team, funding, description, bookmarks
- **Create & manage** — full CRUD for own startups
- **Founder linking** — connect team members to startup

### Hub
- **Events & Competitions** — featured carousel, join/RSVP, participant tracking
- **Jobs & Gigs** — browse opportunities, apply with tracked applications
- **Resources** — AI-powered recommendations, categorized directory
- **Application tracking** — check applied status, submit applications

### Profile
- **Rich profiles** — avatar, banner, bio, skills, work experience, education
- **Projects & Portfolios** — showcase work with dedicated pages
- **Social graph** — followers/following with mutual detection
- **Verification** — verified badge system
- **Profile completion** — percentage-based completion tracking

### Environments (Communities)
- **Community browsing** — grid of available communities
- **Community-scoped posts** — posts tagged to specific environments
- **Member listing** — up to 12 shown in sidebar widget

### Settings
- **Appearance** — Light/Dark/Auto theme, Color schemes (Emerald, Violet, Blue, Amber)
- **Notifications** — Push, email, desktop, sound preferences
- **Privacy & Security** — visibility and access controls
- **Data Management** — account data handling

---

## Layout Architecture

### DashboardLayout (main layout)

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (sticky, h-16)                     │
│  [Logo/Back]                            [Notifications] [⚙️] │
├──────────┬────────────────────────────────┬──────────────────┤
│          │                                │                  │
│ SIDEBAR  │        MAIN CONTENT            │  RIGHT WIDGETS   │
│ (288-    │                                │  (320px, XL+     │
│  340px)  │   Page content renders here    │   only, home)    │
│          │                                │                  │
│ Home     │                                │ Communities      │
│ Search   │                                │ Recent Activity  │
│ Messages │                                │ People to Connect│
│ Startups │                                │                  │
│ Hub      │                                │                  │
│ Profile  │                                │                  │
│          │                                │                  │
│ [User ▼] │                                │                  │
├──────────┴────────────────────────────────┴──────────────────┤
│              MOBILE NAV BAR (fixed bottom, md:hidden)        │
│  Home │ Search │ Messages │ Startups │ Hub │ Profile         │
└─────────────────────────────────────────────────────────────┘
```

### ChatLayout (messages)

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (sticky)                            │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ NAV BAR  │         CHAT CONTENT                              │
│          │                                                   │
│ Home     │  Conversation list ←→ Message thread              │
│ Search   │                                                   │
│ Messages │                                                   │
│ Startups │                                                   │
│ Hub      │                                                   │
│ Profile  │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

---

## API Routes

### Users
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/users` | List users (paginated) |
| GET | `/api/users/search` | Search users by name/email |
| GET | `/api/users/[username]/profile` | Full profile with details |
| GET | `/api/users/by-id/[id]` | Get user by ID |
| POST | `/api/users/[username]/follow` | Follow/unfollow |
| GET | `/api/users/[username]/followers` | Follower list |
| GET | `/api/users/[username]/following` | Following list |
| GET | `/api/users/profile-completion` | Completion percentage |

### Posts & Feed
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/posts` | Fetch/create posts |
| POST | `/api/posts/[postId]/replies` | Reply to post |
| GET | `/api/feed` | Personalized feed algorithm |
| GET | `/api/trending` | Trending posts |
| GET | `/api/recommendations` | Suggested users, trending, jobs |

### Hub Content
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/competitions` | List competitions |
| POST | `/api/competitions/[id]/join` | Join competition |
| GET | `/api/events` | List events |
| POST | `/api/events/[id]/join` | Join event |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/[id]` | Job details |
| GET | `/api/gigs` | List gigs |
| GET | `/api/gigs/[id]` | Gig details |
| GET | `/api/resources` | Resources by category |
| GET | `/api/resources/recommendations` | AI resource recommendations |

### Messaging & Notifications
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/messages` | Message operations |
| GET | `/api/messages/read` | Unread count |
| POST | `/api/messages/reactions` | React to message |
| GET/PATCH | `/api/notifications` | Get/mark read |

### Profile Data
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/users/[username]/projects` | Projects CRUD |
| GET/POST | `/api/users/[username]/work-experience` | Experience CRUD |
| GET/POST | `/api/users/[username]/education` | Education CRUD |
| GET/POST | `/api/users/[username]/portfolios` | Portfolio CRUD |

### Startups
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/startups` | List with filters |
| GET | `/api/startups/[id]` | Startup details |
| POST | `/api/startups/[id]/bookmark` | Bookmark startup |
| GET | `/api/startups/[id]/founders` | Founders list |

### Other
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/environments` | List communities |
| GET | `/api/search` | Multi-type search |
| POST | `/api/verify/send` | Send verification |
| POST | `/api/verify/confirm` | Confirm verification |
| POST | `/api/applications/start` | Start job/gig application |
| POST | `/api/applications/[id]/submit` | Submit application |

---

## Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| **Mobile** (< 768px) | Bottom nav bar, single column, no sidebar, FAB above nav |
| **Tablet** (768px - 1024px) | Sidebar visible (288px), 2-col grids for cards |
| **Desktop** (1024px - 1280px) | Full sidebar (320px) + main content |
| **XL+** (> 1280px) | Sidebar (340px) + content + right widgets (320px) |

### FAB Positioning
- Mobile: `bottom-20 right-4` (above bottom nav)
- Desktop: `bottom-8 right-8`

### Create Post Modal
- Scrollable body with `max-h-[65vh]`
- Sticky header with close button
- Full-width on mobile, max-width on desktop
