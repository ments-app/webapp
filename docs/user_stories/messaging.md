# Messaging User Stories

---

## US-MSG-01: Start a Conversation

**As a** user,
**I want to** start a direct message conversation with another user,
**so that** I can connect and discuss privately.

### Acceptance Criteria
- [ ] User can initiate a DM from another user's profile or search
- [ ] `POST /api/conversations` creates a new conversation with the target participant
- [ ] If a conversation already exists with that user, navigate to it instead of creating a duplicate
- [ ] New conversation appears at the top of the conversation list
- [ ] The other user receives a notification about the new message

### Edge Cases
- User tries to message themselves → prevent with UI guard
- Conversation creation fails → show error, don't navigate away

---

## US-MSG-02: View Conversation List

**As a** user,
**I want to** see all my conversations in one place,
**so that** I can quickly find and continue existing chats.

### Acceptance Criteria
- [ ] Conversations list loaded via `GET /api/conversations`
- [ ] Each row shows: other participant's avatar, name, last message preview, timestamp
- [ ] Unread conversations are visually highlighted
- [ ] List is sorted by most recently active
- [ ] Clicking a conversation opens the message thread

### Edge Cases
- No conversations yet → show empty state with a CTA to start a conversation
- Last message was media (no text) → show "Sent a photo" or similar placeholder

---

## US-MSG-03: Send a Message

**As a** user,
**I want to** send a message in a conversation,
**so that** I can communicate with the other person in real time.

### Acceptance Criteria
- [ ] Message input is at the bottom of the conversation view
- [ ] Pressing send (or Enter) submits via `POST /api/messages`
- [ ] Message appears immediately in the thread (optimistic UI)
- [ ] Message shows sent timestamp and delivery status
- [ ] Recipient receives a push notification

### Edge Cases
- Message is empty → disable send button
- Send fails → mark message as "failed", allow retry
- Very long messages → enforce a character limit with a counter

---

## US-MSG-04: Read Older Messages

**As a** user,
**I want to** scroll back through message history,
**so that** I can reference previous conversations.

### Acceptance Criteria
- [ ] Messages loaded via `GET /api/messages` with cursor-based pagination
- [ ] Older messages load when scrolling to the top (infinite scroll upward)
- [ ] Loading indicator shown while fetching older messages
- [ ] Scroll position preserved after loading more messages

### Edge Cases
- No older messages → stop pagination silently (no error)
- Large conversation → load in chunks of ~20–50 messages

---

## US-MSG-05: React to a Message

**As a** user,
**I want to** react to a message with an emoji,
**so that** I can respond quickly without typing a full reply.

### Acceptance Criteria
- [ ] Long-press or hover on a message shows emoji reaction picker
- [ ] Selecting an emoji calls `POST /api/messages/reactions`
- [ ] Reaction appears below the message immediately
- [ ] User can remove their own reaction via `DELETE /api/messages/reactions`
- [ ] Multiple users can react with the same or different emojis
- [ ] Reaction counts shown grouped by emoji

### Edge Cases
- User reacts to an already-reacted message with the same emoji → remove the reaction (toggle)
- Emoji picker fails to load → show basic fallback set (👍 ❤️ 😂 😮)

---

## US-MSG-06: Mark Messages as Read

**As a** user,
**I want to** mark messages as read when I open a conversation,
**so that** unread indicators are accurate across devices.

### Acceptance Criteria
- [ ] Opening a conversation triggers `POST /api/messages/read`
- [ ] Unread badge on conversation list clears immediately
- [ ] Read status is updated on the server

### Edge Cases
- User opens conversation but immediately closes it (< 1 second) → still mark as read
- Marking read fails silently → retry in background, don't show an error to user
