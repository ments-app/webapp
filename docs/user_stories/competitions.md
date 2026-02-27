# Competitions User Stories

---

## US-COMP-01: Browse Competitions

**As a** user,
**I want to** browse active competitions,
**so that** I can find challenges to participate in and showcase my skills.

### Acceptance Criteria
- [ ] Competitions loaded via `GET /api/competitions`
- [ ] Each card shows: title, organizer, deadline, prizes, entry count
- [ ] Filter by type, status (open/closed), or category
- [ ] Closed/past competitions shown in a separate section

### Edge Cases
- No active competitions → show upcoming or past competitions with a clear label

---

## US-COMP-02: Join a Competition

**As a** user,
**I want to** join a competition,
**so that** I can submit my entry and compete.

### Acceptance Criteria
- [ ] Join action calls `POST /api/competitions/[id]/join`
- [ ] User receives confirmation and instructions for submission
- [ ] Joined competition appears in user's active entries
- [ ] Join button changes to "Joined" after registering

### Edge Cases
- Competition deadline has passed → button disabled, show "Submissions Closed"
- User already joined → idempotent, show current entry status

---

## US-COMP-03: View Competition Entries

**As a** user or organizer,
**I want to** view all entries for a competition,
**so that** I can see the quality of submissions and compare them.

### Acceptance Criteria
- [ ] Entries loaded via `GET /api/competitions/[id]/entries`
- [ ] Each entry shows submitter, submission content/link, and submission date
- [ ] Organizer can see all entries; public may see entries depending on competition settings

### Edge Cases
- Competition has no entries yet → show empty state
- Entry content is a broken link → show a "Content unavailable" placeholder

---

## US-COMP-04: Create a Competition

**As a** Founder or organizer,
**I want to** create a competition on the platform,
**so that** I can source talent, ideas, or solutions from the community.

### Acceptance Criteria
- [ ] Competition creation via `POST /api/competitions`
- [ ] Required: title, description, deadline, category
- [ ] Optional: prizes, rules, submission format, max entries
- [ ] Competition visible in directory immediately after creation

### Edge Cases
- Deadline set in the past → validation error
- No prizes specified → allowed (recognition-only competitions)
