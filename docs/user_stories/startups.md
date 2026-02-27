# Startups User Stories

---

## US-START-01: Create a Startup Profile

**As a** Founder,
**I want to** create a startup profile,
**so that** I can showcase my company to builders, investors, and the community.

### Acceptance Criteria
- [ ] Founder can create a startup via `POST /api/startups`
- [ ] Required fields: name, elevator pitch, category, stage
- [ ] Optional fields: logo, banner, business model, city, country, team size, target audience, key strengths, traction metrics
- [ ] Startup appears in the directory after creation
- [ ] Creator is automatically set as the first founder

### Edge Cases
- Startup with the same name already exists → warn but allow (names are not unique keys)
- Logo/banner upload fails → startup can be saved without media, add later

---

## US-START-02: View Startup Profile

**As a** user,
**I want to** view a startup's public profile,
**so that** I can learn about the company, its founders, and its progress.

### Acceptance Criteria
- [ ] Profile shows: name, logo, banner, pitch, category, stage, location, business model
- [ ] Founders section shows verified co-founders (pending founders hidden from public)
- [ ] Funding rounds listed if added
- [ ] Traction metrics shown if provided
- [ ] View event tracked via `POST /api/startups/[id]/view`

### Edge Cases
- Startup has no logo → show placeholder with startup initial
- Visitor (not logged in) → can view public info but cannot bookmark or follow

---

## US-START-03: Edit Startup Profile

**As a** Founder (owner or co-founder),
**I want to** update my startup's profile,
**so that** information stays accurate as the company evolves.

### Acceptance Criteria
- [ ] Only owner or accepted co-founders can edit
- [ ] Edit form pre-filled with current values
- [ ] Changes saved via `POST /api/startups/[id]`
- [ ] Changes reflected immediately on the public profile
- [ ] Logo and banner can be replaced

### Edge Cases
- Co-founder tries to edit after declining invitation → access denied
- Two co-founders edit simultaneously → last write wins (no conflict resolution required for now)

---

## US-START-04: Invite a Co-Founder

**As a** Founder,
**I want to** invite someone as a co-founder of my startup,
**so that** they are officially associated with the company on the platform.

### Acceptance Criteria
- [ ] Owner can invite by Ments username or email via `POST /api/startups/[id]/founders`
- [ ] Invitation stored with `status: pending`
- [ ] Pending founders are hidden from public profile
- [ ] Invitee receives a notification/email about the invitation
- [ ] Pending founder visible to owner and existing accepted co-founders with an "Invited" badge

### Edge Cases
- Invitee is not on Ments (email-only invite) → invitation stored, activated when they join
- Inviting the same person twice → prevent duplicate, show existing pending invitation
- Owner invites themselves → block with a validation error

---

## US-START-05: Accept or Decline Co-Founder Invitation

**As a** invited user,
**I want to** accept or decline a co-founder invitation,
**so that** I have control over my association with a startup.

### Acceptance Criteria
- [ ] Invitation appears in notifications or a dedicated section
- [ ] Accept calls `POST /api/startups/founders/respond` with `status: accepted`
- [ ] Decline calls the same endpoint with `status: declined`
- [ ] On accept: user appears on the public startup profile as a co-founder
- [ ] On decline: invitation removed, founder notified

### Edge Cases
- Invitation expired or startup deleted before response → show a "no longer available" message
- User accepts on mobile and declines on desktop at the same time → first response wins

---

## US-START-06: Add a Funding Round

**As a** Founder,
**I want to** log a funding round on my startup profile,
**so that** investors and the community know about our fundraising progress.

### Acceptance Criteria
- [ ] Founder can add a funding round via `POST /api/startups/[id]/funding`
- [ ] Fields: round type (pre-seed, seed, series A, etc.), amount, currency, date
- [ ] Rounds listed chronologically on the startup profile
- [ ] Total raised calculated and shown

### Edge Cases
- Amount is 0 (e.g. grant or non-dilutive funding) → allowed
- Currency mismatch across rounds → display each round in its own currency, show total as "multiple currencies"

---

## US-START-07: Bookmark a Startup

**As a** user,
**I want to** bookmark startups I find interesting,
**so that** I can revisit them later without searching again.

### Acceptance Criteria
- [ ] Bookmark button visible on every startup card and profile
- [ ] Clicking toggles bookmark via `POST /api/startups/[id]/bookmark`
- [ ] Bookmarked startups accessible from user's saved items
- [ ] Bookmark state persists across sessions

### Edge Cases
- User removes bookmark → removed immediately with optimistic update
- Bookmarked startup is deleted → removed from saved list gracefully

---

## US-START-08: Browse Startup Directory

**As a** user,
**I want to** browse all startups on the platform,
**so that** I can discover companies to join, invest in, or collaborate with.

### Acceptance Criteria
- [ ] Startups loaded via `GET /api/startups` with pagination
- [ ] Filter by category, stage, or location
- [ ] Each card shows: logo, name, pitch, category, team size
- [ ] Results cached for fast load

### Edge Cases
- No startups match filters → show empty state with a prompt to clear filters
- Directory is empty → show a CTA for founders to create their first startup
