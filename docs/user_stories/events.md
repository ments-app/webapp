# Events User Stories

---

## US-EVT-01: Browse Events

**As a** user,
**I want to** browse upcoming community events,
**so that** I can find networking and learning opportunities relevant to me.

### Acceptance Criteria
- [ ] Events loaded via `GET /api/events` with pagination
- [ ] Filter by category, date range, or location
- [ ] Each card shows: title, date, type (online/in-person), organizer, attendee count
- [ ] Results cached for performance

### Edge Cases
- No upcoming events → show past events or a CTA to create one
- Filters return no results → show empty state with prompt to clear filters

---

## US-EVT-02: View Event Details

**As a** user,
**I want to** view the full details of an event,
**so that** I can decide whether to join and know how to attend.

### Acceptance Criteria
- [ ] Event detail page shows: title, description, date/time, location/link, organizer, attendees
- [ ] Join button visible for events user hasn't joined
- [ ] Attendee list shown (or count if list is private)
- [ ] "Add to Calendar" option available

### Edge Cases
- Event is in the past → show as archived with no Join button
- Event link is broken (online event) → organizer notified, placeholder shown

---

## US-EVT-03: Join an Event

**As a** user,
**I want to** join an event,
**so that** I'm registered and receive reminders and updates.

### Acceptance Criteria
- [ ] Join action calls `POST /api/events/[id]/join`
- [ ] Attendee count increments immediately (optimistic)
- [ ] User receives a confirmation notification
- [ ] Event appears in user's joined events list
- [ ] Join button changes to "Joined" or "Leave" after joining

### Edge Cases
- Event is at capacity → show "Full" with an option to join a waitlist
- User tries to join twice → idempotent, show "Already joined"

---

## US-EVT-04: Create an Event

**As a** Founder or Builder,
**I want to** create a community event,
**so that** I can host workshops, demos, or networking sessions on the platform.

### Acceptance Criteria
- [ ] Event creation form accessible from the events section
- [ ] Required fields: title, description, date/time, type (online/in-person)
- [ ] Optional fields: location, category, max attendees, banner image
- [ ] Created via `POST /api/events`
- [ ] Event immediately visible in the directory

### Edge Cases
- Date set in the past → validation error
- Max attendees set to 0 → treat as unlimited
