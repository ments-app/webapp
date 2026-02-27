# Auth & Onboarding User Stories

---

## US-AUTH-01: Sign In with Google

**As a** Visitor,
**I want to** sign in with my Google account,
**so that** I can access the platform without creating a separate password.

### Acceptance Criteria
- [ ] A "Sign in with Google" button is visible on the auth page
- [ ] Clicking it redirects to Google OAuth consent screen
- [ ] On success, user is redirected back and session is established
- [ ] If the user is new, they are sent to onboarding
- [ ] If the user already has an account, they land on the feed

### Edge Cases
- Google account is suspended → show a clear error, do not create a broken account
- User denies OAuth consent → return to auth page with a message
- Session cookie already exists → skip auth, redirect to feed directly

---

## US-AUTH-02: Email Verification

**As a** new user,
**I want to** verify my email address with a 6-digit code,
**so that** the platform can trust my identity beyond OAuth.

### Acceptance Criteria
- [ ] After sign-in, unverified users are prompted to verify their email
- [ ] A 6-digit code is sent to the email associated with their Google account
- [ ] User can enter the code in a form
- [ ] On correct code entry, account is marked as verified
- [ ] Incorrect code shows an error and allows retry
- [ ] Code expires after a reasonable TTL (e.g. 10 minutes)
- [ ] User can request a new code (resend)

### Edge Cases
- User enters code after expiry → prompt to resend
- User switches devices mid-verification → code still valid if not expired
- Email delivery fails → surface an error with retry option

---

## US-AUTH-03: Onboarding Role Selection

**As a** newly verified user,
**I want to** select my role on the platform (founder, builder, etc.),
**so that** my experience and feed are personalized to my goals.

### Acceptance Criteria
- [ ] After verification, user is shown an onboarding screen
- [ ] User can select one role from available options (Founder, Builder, Explorer, Investor)
- [ ] Selection is saved via `POST /api/onboarding`
- [ ] After selecting, user is taken to profile setup or the feed
- [ ] Role selection is reflected in how content is ranked and surfaced

### Edge Cases
- User skips or closes onboarding → re-prompt on next login until completed
- User wants to change role later → allow from profile settings

---

## US-AUTH-04: Session Persistence

**As a** returning user,
**I want to** stay logged in across sessions,
**so that** I don't have to sign in every time I open the app.

### Acceptance Criteria
- [ ] Session cookie persists across browser restarts
- [ ] Middleware validates session on every request server-side
- [ ] Expired sessions redirect to the auth page without a crash
- [ ] User is not asked to sign in again while session is valid

### Edge Cases
- Cookie is tampered with → treat as unauthenticated, redirect to auth
- Session expires mid-session → prompt to re-authenticate without losing current page context
