# Profile User Stories

---

## US-PROF-01: View Own Profile

**As a** logged-in user,
**I want to** view my own profile page,
**so that** I can see how others perceive me and track my profile completeness.

### Acceptance Criteria
- [ ] Profile page shows avatar, name, username, bio, role, and location
- [ ] A profile completion percentage is shown (from `GET /api/users/profile-completion`)
- [ ] Sections shown: Education, Work Experience, Portfolios, Projects, Positions
- [ ] An "Edit" option is available for the authenticated owner
- [ ] Profile is accessible at `/profile/[username]`

### Edge Cases
- User has no avatar → show initial-based placeholder
- Profile is incomplete → prompt user with which sections are missing

---

## US-PROF-02: View Another User's Profile

**As a** logged-in user,
**I want to** view another user's public profile,
**so that** I can learn about their background and decide whether to connect or collaborate.

### Acceptance Criteria
- [ ] Profile page shows all public fields (name, bio, role, education, work experience, portfolios)
- [ ] Follow/Unfollow button is visible and functional
- [ ] Follower and following counts are shown
- [ ] Projects associated with the user are listed
- [ ] No edit controls visible for non-owners

### Edge Cases
- User visits their own profile via direct URL → show owner view with edit options
- Profile username doesn't exist → 404 page

---

## US-PROF-03: Edit Profile

**As a** user,
**I want to** update my profile information,
**so that** my profile accurately reflects my current skills, role, and experience.

### Acceptance Criteria
- [ ] User can edit: name, bio, avatar, location, role
- [ ] User can add/edit/delete Education entries
- [ ] User can add/edit/delete Work Experience entries
- [ ] User can add/edit/delete Portfolio items
- [ ] User can add/edit/delete Career Positions
- [ ] Changes are saved and reflected immediately on profile

### Edge Cases
- Avatar upload fails (file too large, wrong format) → show specific error
- User removes all education entries → section is hidden from public profile

---

## US-PROF-04: Follow a User

**As a** user,
**I want to** follow another user,
**so that** their posts appear in my feed and I can stay updated on their work.

### Acceptance Criteria
- [ ] Follow button visible on any profile that isn't the logged-in user's
- [ ] Clicking Follow sends `POST /api/users/[username]/follow`
- [ ] Button toggles to Unfollow after following
- [ ] Follower count updates immediately (optimistic UI)
- [ ] Followed user receives a notification

### Edge Cases
- User tries to follow themselves → button not shown
- Follow request fails (network error) → revert optimistic update, show error

---

## US-PROF-05: View Followers and Following

**As a** user,
**I want to** see who follows me and who I follow,
**so that** I can manage my network and discover new people.

### Acceptance Criteria
- [ ] Followers and Following tabs visible on every profile
- [ ] Each list shows avatar, name, username, and a Follow/Unfollow button
- [ ] Lists paginate for large networks
- [ ] Owner can see their own full lists; visitors see public lists

### Edge Cases
- Empty follower/following list → show empty state with a CTA to discover people
