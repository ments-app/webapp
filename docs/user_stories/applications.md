# Applications User Stories

---

## US-APP-01: Start an Application

**As a** user,
**I want to** apply to a program on the platform,
**so that** I can get access to accelerators, grants, or community programs.

### Acceptance Criteria
- [ ] Apply button visible on program detail pages
- [ ] `POST /api/applications/start` creates a new application draft
- [ ] User is taken to the application form after starting
- [ ] If an existing application exists for the same program, navigate to it instead of creating a new one

### Edge Cases
- Application period is closed → button disabled, show "Applications Closed"
- User is already accepted to the program → show current status instead of apply button

---

## US-APP-02: Answer Application Questions

**As a** applicant,
**I want to** answer the program's questions one by one,
**so that** I can complete my application at my own pace.

### Acceptance Criteria
- [ ] Questions loaded from `GET /api/applications/[id]`
- [ ] Each answer submitted individually via `POST /api/applications/[id]/answer`
- [ ] Answers auto-saved — user can leave and return without losing progress
- [ ] Progress indicator shows how many questions remain
- [ ] User can edit previous answers before final submission

### Edge Cases
- Question requires a minimum word count → enforce with a counter and validation
- User's session expires mid-application → answers saved server-side, resume on next login

---

## US-APP-03: Submit Application

**As a** applicant,
**I want to** submit my completed application,
**so that** the program organizers can review it.

### Acceptance Criteria
- [ ] Submit button enabled only when all required questions are answered
- [ ] `POST /api/applications/[id]/submit` finalizes the application
- [ ] User receives a confirmation notification
- [ ] Application status changes to "Submitted"
- [ ] Answers are locked (read-only) after submission

### Edge Cases
- Submission fails (server error) → show error, keep application in draft state
- User tries to submit incomplete application via API directly → server-side validation rejects it

---

## US-APP-04: Check Application Status

**As a** applicant,
**I want to** check the status of my submitted application,
**so that** I know if it's under review, accepted, or rejected.

### Acceptance Criteria
- [ ] Application status visible via `GET /api/applications/[id]`
- [ ] Statuses: Draft, Submitted, Under Review, Accepted, Rejected
- [ ] User notified when status changes
- [ ] If accepted, next steps or program details shown

### Edge Cases
- Application rejected → show reason if provided, otherwise "We'll be in touch"
- Program cancelled after submission → notify all applicants

---

## US-APP-05: Check for Existing Application

**As a** user revisiting a program,
**I want to** be told if I've already applied,
**so that** I don't accidentally start a duplicate application.

### Acceptance Criteria
- [ ] `GET /api/applications/check?program_id=...` returns existing application if found
- [ ] Program page shows current application status instead of the Apply button
- [ ] Clicking status navigates to the existing application

### Edge Cases
- Existing application is in Draft state → show "Continue Application" instead of status
