# Gigs & Jobs User Stories

---

## US-GIG-01: Browse Gigs

**As a** Builder,
**I want to** browse available gigs,
**so that** I can find short-term paid work that matches my skills.

### Acceptance Criteria
- [ ] Gigs loaded via `GET /api/gigs`
- [ ] Each card shows: title, poster, skills required, compensation, deadline
- [ ] Filter by skill, type, or compensation range
- [ ] Pagination for large result sets

### Edge Cases
- No gigs available → show empty state with CTA to post one
- Gig deadline has passed → show as expired, deprioritize in listing

---

## US-GIG-02: View Gig Details

**As a** Builder,
**I want to** view full gig details,
**so that** I can assess if it's a good fit before applying.

### Acceptance Criteria
- [ ] Detail page loaded via `GET /api/gigs/[id]`
- [ ] Shows: full description, required skills, timeline, compensation, poster info
- [ ] Apply/Contact button visible and functional
- [ ] Similar gigs shown at the bottom

### Edge Cases
- Gig no longer available → show "This gig has been filled" message

---

## US-GIG-03: Post a Gig

**As a** Founder or Builder,
**I want to** post a gig on the platform,
**so that** I can find skilled people for a specific short-term task.

### Acceptance Criteria
- [ ] Gig creation via `POST /api/gigs`
- [ ] Required: title, description, skills needed, timeline
- [ ] Optional: compensation, remote/in-person, attachment
- [ ] Gig visible in directory after posting

### Edge Cases
- Skills field is empty → prompt to add at least one skill
- Compensation field is 0 → allowed (volunteer/equity-only gigs)

---

## US-JOB-01: Browse Jobs

**As a** Builder or Explorer,
**I want to** browse full-time or part-time job listings,
**so that** I can find opportunities at startups I admire.

### Acceptance Criteria
- [ ] Jobs loaded via `GET /api/jobs`
- [ ] Each card shows: title, company, location, type (full-time/part-time/remote), posted date
- [ ] Filter by location, job type, or company stage
- [ ] Pagination supported

### Edge Cases
- No jobs matching filters → clear filters prompt
- Job listing is outdated (>90 days) → tag as "Possibly Filled"

---

## US-JOB-02: View Job Details

**As a** Builder,
**I want to** read the full job description,
**so that** I can decide whether to apply.

### Acceptance Criteria
- [ ] Detail page loaded via `GET /api/jobs/[id]`
- [ ] Shows: full description, responsibilities, requirements, benefits, company info
- [ ] Apply button links to application or external URL
- [ ] Related jobs from same company shown

### Edge Cases
- External apply link is broken → show fallback "Contact the company directly"

---

## US-JOB-03: Post a Job

**As a** Founder,
**I want to** post a job opening,
**so that** I can attract talent from the Ments community.

### Acceptance Criteria
- [ ] Job creation via `POST /api/jobs`
- [ ] Required: title, description, type, location
- [ ] Optional: salary range, equity, benefits, apply link or in-app application
- [ ] Linked to founder's startup profile automatically

### Edge Cases
- No startup profile exists → prompt to create one first
