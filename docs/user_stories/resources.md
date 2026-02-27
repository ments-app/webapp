# Resources User Stories

---

## US-RES-01: Browse Resources

**As a** user,
**I want to** browse learning resources curated for founders and builders,
**so that** I can upskill and access useful tools without searching the web.

### Acceptance Criteria
- [ ] Resources loaded via `GET /api/resources` (cached)
- [ ] Each card shows: title, type (article/video/tool/template), source, tags
- [ ] Filter by type or category
- [ ] Pagination supported

### Edge Cases
- No resources in a category → show empty state
- Resource URL is broken → flag as "Link unavailable" with report option

---

## US-RES-02: View Resource Details

**As a** user,
**I want to** view the details of a resource before opening it,
**so that** I can decide if it's worth my time.

### Acceptance Criteria
- [ ] Detail view loaded via `GET /api/resources/[id]`
- [ ] Shows: title, description, author/source, estimated read/watch time, tags
- [ ] Primary CTA opens the resource URL in a new tab
- [ ] Related resources listed below

### Edge Cases
- Resource is behind a paywall → clearly label as "Paid"

---

## US-RES-03: Get Personalized Resource Recommendations

**As a** user,
**I want to** receive resource recommendations tailored to my role and interests,
**so that** I spend time learning things that actually help me.

### Acceptance Criteria
- [ ] Recommendations fetched via `GET /api/resources/recommendations`
- [ ] Based on user role (founder/builder) and topic engagement history
- [ ] Refreshes as user engages with more content
- [ ] User can dismiss individual recommendations

### Edge Cases
- New user with no history → default to top resources for their selected role
- All recommendations already viewed → surface newer or less-seen resources
