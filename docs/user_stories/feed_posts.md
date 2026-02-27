# Feed & Posts User Stories

---

## US-FEED-01: View Personalized Feed

**As a** logged-in user,
**I want to** see a personalized feed of posts,
**so that** I discover relevant content from founders, builders, and projects I care about.

### Acceptance Criteria
- [ ] Feed loads on the hub/home page after login
- [ ] Posts are ranked by the AI feed engine based on user interest profile
- [ ] Feed falls back to chronological order if AI ranking fails
- [ ] Feed is cached per user (15–30 min TTL) for fast loads
- [ ] Scrolling loads more posts (infinite scroll / pagination)

### Edge Cases
- First-time user with no interest profile → show trending/popular posts
- All cached posts already seen → trigger feed refresh automatically
- Network failure → show cached feed if available, else an error state

---

## US-FEED-02: Refresh Feed

**As a** user,
**I want to** manually refresh my feed,
**so that** I see the latest posts without waiting for cache expiry.

### Acceptance Criteria
- [ ] A refresh action (pull-to-refresh or button) triggers `POST /api/feed/refresh`
- [ ] Feed reloads with freshly ranked posts after refresh
- [ ] Loading state shown during refresh
- [ ] User's scroll position resets to top after refresh

### Edge Cases
- Refresh called while another refresh is in progress → debounce, do not double-call

---

## US-FEED-03: Create a Post

**As a** user,
**I want to** create a post,
**so that** I can share updates, insights, or questions with the community.

### Acceptance Criteria
- [ ] Post composer is accessible from the feed
- [ ] User can write text content (rich text / plain)
- [ ] User can attach media (images, videos)
- [ ] User can create a poll with multiple options
- [ ] Post is submitted via `POST /api/posts`
- [ ] New post appears at the top of the feed immediately (optimistic insert)

### Edge Cases
- Post with no content and no media → disable submit button
- Media upload fails → show error, keep draft text intact
- Poll created with fewer than 2 options → validation error

---

## US-FEED-04: Reply to a Post

**As a** user,
**I want to** reply to a post,
**so that** I can engage in conversation around ideas and updates.

### Acceptance Criteria
- [ ] Each post has a reply/comment action
- [ ] Reply composer opens inline or in a modal
- [ ] Reply is submitted via `POST /api/posts/[postId]/replies`
- [ ] Reply count on the post increments immediately
- [ ] Post author receives a notification when replied to

### Edge Cases
- Reply is empty → disable submit
- Reply fails to submit → show error and preserve draft

---

## US-FEED-05: View Replies on a Post

**As a** user,
**I want to** read all replies on a post,
**so that** I can follow the conversation and different perspectives.

### Acceptance Criteria
- [ ] Clicking a post expands or navigates to a detail view showing all replies
- [ ] Replies are loaded via `GET /api/posts/[postId]/replies`
- [ ] Replies are shown in chronological order
- [ ] Each reply shows author, avatar, timestamp, and content
- [ ] Nested replies (replies to replies) shown if supported

### Edge Cases
- Post has no replies → show empty state ("Be the first to reply")
- Post deleted after user opened it → show a "post no longer available" message

---

## US-FEED-06: Feed Interest Tracking

**As the** platform,
**I want to** track what users engage with in the feed,
**so that** the AI ranking model improves over time for each user.

### Acceptance Criteria
- [ ] Impressions tracked when a post enters the viewport
- [ ] Clicks, likes, dwell time, and shares tracked per post per user
- [ ] Events stored in `feed_events` table
- [ ] User interest profile updated based on accumulated events
- [ ] Feed ranking improves as more data is collected

### Edge Cases
- User scrolls rapidly → only count impressions above a minimum dwell threshold
- Duplicate events (network retry) → deduplicate on event ID
