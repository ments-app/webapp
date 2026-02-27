# Discovery User Stories

---

## US-DISC-01: Global Search

**As a** user,
**I want to** search across users, posts, and startups from one search bar,
**so that** I can find anything on the platform quickly.

### Acceptance Criteria
- [ ] Search bar accessible from anywhere in the app
- [ ] Results from `GET /api/search?q=...` shown in categorized sections (People, Posts, Startups)
- [ ] Results appear as user types (debounced, ~300ms)
- [ ] Clicking a result navigates to the relevant profile/post/startup
- [ ] User can filter by type (People / Posts / Startups)

### Edge Cases
- Query is blank → show recent searches or trending topics
- No results found → show "No results for X" with suggested alternatives
- Search service is slow → show a loading skeleton, not a blank page

---

## US-DISC-02: Trending Topics

**As a** user,
**I want to** see what topics are trending on the platform,
**so that** I can discover what the community is talking about right now.

### Acceptance Criteria
- [ ] Trending topics loaded via `GET /api/trending`
- [ ] Shown as a list or tag cloud with topic labels
- [ ] Clicking a topic filters the feed or search to posts about that topic
- [ ] Topics refresh periodically (driven by `trending_topics` table with velocity metrics)

### Edge Cases
- No trending topics available → hide section or show "Nothing trending yet"
- Trending topic contains offensive content → moderation layer filters it out

---

## US-DISC-03: Personalized Recommendations

**As a** user,
**I want to** see personalized recommendations for people, startups, and content,
**so that** I discover things relevant to my interests without searching.

### Acceptance Criteria
- [ ] Recommendations loaded via `GET /api/recommendations`
- [ ] Includes: suggested users to follow, startups to explore, resources to read
- [ ] Recommendations based on user's interest profile and interaction history
- [ ] Shown on a dedicated discovery page or sidebar
- [ ] Dismissing a recommendation removes it from the list

### Edge Cases
- New user with no history → show popular/trending items as default recommendations
- User has followed all recommended people → refresh with new suggestions

---

## US-DISC-04: Personalized Resource Recommendations

**As a** user,
**I want to** get resource recommendations tailored to my role and interests,
**so that** I can learn what's most relevant to my work.

### Acceptance Criteria
- [ ] Recommendations loaded via `GET /api/resources/recommendations`
- [ ] Based on user's role (founder, builder, etc.) and topics engaged with
- [ ] Each resource shows: title, type, source, estimated read time
- [ ] User can mark a resource as "saved" or "not interested"

### Edge Cases
- No personalized data available yet → show curated picks by category
