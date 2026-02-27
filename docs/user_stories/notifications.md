# Notifications User Stories

---

## US-NOTIF-01: Receive In-App Notifications

**As a** user,
**I want to** see notifications inside the app,
**so that** I know about replies, mentions, follows, and other activity.

### Acceptance Criteria
- [ ] Notification bell icon in nav shows unread count badge
- [ ] Clicking opens a notification panel/page
- [ ] Notifications fetched via `POST /api/notifications`
- [ ] Each notification shows: type, actor (who triggered it), preview, timestamp
- [ ] Clicking a notification navigates to the relevant content

### Notification Types
- Reply to your post
- Mention in a post or reply
- New follower
- Co-founder invitation
- Co-founder acceptance/decline
- Application status change
- Event reminder

### Edge Cases
- Notification links to deleted content → show "Content no longer available"
- More than 99 unread → show "99+" on badge

---

## US-NOTIF-02: Receive Push Notifications

**As a** user,
**I want to** receive push notifications even when I'm not in the app,
**so that** I don't miss important activity.

### Acceptance Criteria
- [ ] User is prompted to allow push notifications on first login
- [ ] Push sent via `POST /api/push-notification` for general events
- [ ] `POST /api/push-on-mention` triggers on mentions
- [ ] `POST /api/push-on-reply` triggers on replies to user's posts
- [ ] Tapping push notification opens the relevant content in the app

### Edge Cases
- User denies push permission → app works normally, in-app notifications still shown
- Push delivery fails (device offline) → deliver when device comes back online via service worker

---

## US-NOTIF-03: Manage Notification Preferences

**As a** user,
**I want to** control which notifications I receive,
**so that** I'm not overwhelmed by irrelevant alerts.

### Acceptance Criteria
- [ ] Notification settings accessible from profile/settings page
- [ ] User can toggle each notification type (replies, mentions, follows, etc.) on/off
- [ ] Separate controls for push vs. in-app notifications
- [ ] Settings saved and respected immediately

### Edge Cases
- User disables all notifications → no push or badge updates, still visible if they open the panel manually
