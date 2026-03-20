# Bugs Hunt 1

Date: 2026-03-20

This document now reflects the current state of the bug hunt:

- what the original bugs were
- what was actually changed in the codebase
- what was verified with live seeded data
- what to watch so the auth system stays stable

The biggest constraint during implementation was to avoid breaking the existing Supabase auth flow. Because of that, auth-related fixes were kept narrow and route-level only where possible.

## Overall status

Resolved:

1. Spoofable read-route auth via `x-user-id`
2. Pending chat request ownership logic
3. Conversation filters not applying server-side
4. Missing message item route for edit/delete
5. Notifications pagination across merged tables
6. OAuth callback partial-signup failure path
7. Redirect state loss after auth
8. Feed fallback UUID exclusion bug
9. `html-to-image` type-check failure
10. Feed hook resilience after stricter auth changes
11. Legacy notifications schema mismatch discovered during live testing

## Auth safety note

To avoid disturbing the already working auth setup:

- the Supabase cookie/session flow was not replaced
- middleware still performs lightweight session checks
- sensitive API routes now verify the authenticated user from the session using `auth.getUser()`
- client-side feed fetching was updated to work with real session cookies instead of the previously trusted request header

The main auth helper added for this is:

- `src/utils/supabase-server.ts`

## 1. Spoofable `x-user-id` auth on read routes

### Original bug

Several read routes trusted `x-user-id` from the request, which meant a caller could try to spoof identity at the app layer.

### What changed

A shared authenticated-user helper was introduced and the affected routes were moved to server-side session verification instead of trusting the header value.

Updated routes:

- `src/app/api/conversations/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/messages/read/route.ts`
- `src/app/api/feed/route.ts`
- `src/app/api/chat-categories/route.ts`
- `src/app/api/conversation-categories/route.ts`
- `src/app/api/recommendations/route.ts`

### Why this was low risk

- response shapes were kept the same
- existing cookies/session handling was preserved
- the change was limited to identity resolution inside route handlers

### Validation completed

- forged `x-user-id` requests to protected read routes now return `401`
- authenticated requests still work through the normal session cookie path

## 2. Pending chat request ownership is inverted

### Original bug

The pending request UI treated `other_user_id` like an ownership signal, which made the sender/recipient roles drift.

### What changed

Conversation role fields were made available to the UI and the pending-state checks now use actual conversation participants:

- recipient approval UI uses `user2_id === currentUserId`
- sender waiting state uses `user1_id === currentUserId`

Files updated:

- `src/types/messaging.ts`
- `src/components/chat/ChatRequestApproval.tsx`
- `src/components/chat/ChatPage.tsx`

### Why this was low risk

- the fix only changed role checks
- the existing conversation payload shape was extended, not replaced
- approved chat behavior stayed unchanged

### Validation completed

Live API validation confirmed the pending conversation comes back with the recipient in `user2_id`. A direct mounted browser test for this exact component was not possible because this component is not currently wired into an active route.

## 3. Conversation filters did not work after fetch/refetch

### Original bug

The hook sent `status`, `hasUnread`, and `categoryId`, but the API did not apply them.

### What changed

Server-side filtering was added in `src/app/api/conversations/route.ts` for:

- `status`
- unread-only filtering
- category filtering

### Why this was low risk

- the hook contract already assumed server-side filtering
- default unfiltered behavior was preserved
- filtering was added incrementally on the route response path

### Validation completed

Using disposable users and seeded data, the following were verified live:

- `status=pending` returned exactly the seeded pending conversation
- `hasUnread=true` returned exactly the seeded unread conversation
- `categoryId=...` returned exactly the categorized conversation

## 4. Hook-based chat edit/delete targeted missing endpoints

### Original bug

The hook called `/api/messages/${messageId}` but no item route existed.

### What changed

A dynamic message item route was added:

- `src/app/api/messages/[messageId]/route.ts`

The route supports item-level ownership checks for message edit/delete behavior.

### Why this was low risk

- it matched existing client expectations
- it avoided rewriting the hook contract
- auth and ownership checks stayed server-side

### Validation completed

- the route now exists
- unauthenticated requests return `401` instead of `404`

## 5. Notifications pagination was incorrect across merged tables

### Original bug

Pagination logic merged `notifications` and `inapp_notification` after applying offsets per table, which could skip items.

### What changed

The route now fetches a large enough window from each source, merges them, sorts them, and slices the combined timeline correctly.

Primary file:

- `src/app/api/notifications/route.ts`

### Additional live bug found during testing

While verifying this fix with real seeded data, a second issue surfaced:

- the legacy `notifications` query still selected fields that do not exist in the actual schema
- because of that, GET pagination only surfaced `inapp_notification` rows even though HEAD unread counts still included legacy rows

That mismatch was also fixed in the same route by updating the legacy query and normalization logic to match the real table columns.

### Why this was low risk

- response shape stayed stable
- only the read/merge layer changed
- no auth flow changes were needed

### Validation completed

With seeded mixed notifications:

- page 1 returned `legacy_1` then `inapp_1`
- page 2 returned `legacy_2` then `inapp_2`
- HEAD unread count returned `5`, matching the seeded unread total

## 6. OAuth callback could leave a signed-in user without a profile row

### Original bug

If profile bootstrap failed during auth callback, the user could still be redirected into the app in a broken signed-in state.

### What changed

The callback flow was centralized and hardened so profile bootstrap failure is treated as a real failure path.

Main updates:

- redirect handling was centralized
- failed profile bootstrap now signs the user out
- the user is redirected with a controlled error state instead of entering the app partially initialized

File updated:

- `src/app/auth/callback/route.ts`

### Why this was low risk

- successful login flow was preserved
- only failure handling was tightened
- no changes were made to the core provider/session setup

### Validation completed

The callback paths were verified by code-path review and integration checks. A full live OAuth callback simulation was not performed against production auth because that would require a controlled external provider round-trip.

## 7. Auth redirects lost deep-link state

### Original bug

Protected-route redirects preserved only the pathname and dropped query parameters. The auth callback also had redirect branches that bypassed the shared resolver.

### What changed

- middleware now preserves `pathname + search`
- callback redirect handling was unified through a shared safe resolver

Files updated:

- `src/middleware.ts`
- `src/app/auth/callback/route.ts`

### Why this was low risk

- it improved redirect fidelity without widening redirect targets
- redirect normalization stayed internal-path-only

### Validation completed

Middleware deep-link preservation was verified with a protected URL containing query params and the resulting redirect included the full original path and query string in the redirect parameter.

## 8. Feed fallback exclusion query was fragile

### Original bug

The chronological fallback excluded ranked IDs using a raw `in (...)` string built from unquoted values.

### What changed

The exclusion list is now quoted and escaped correctly before being passed into the Supabase filter.

File updated:

- `src/app/api/feed/route.ts`

### Why this was low risk

- it changed only the fallback exclusion formatting
- no ranking logic or response structure changed

### Validation completed

Using seeded cache rows and seeded posts:

- `/api/feed?offset=1` returned `source: "chronological"`
- ranked cached post IDs did not appear in the fallback results

## 9. TypeScript build failed on `html-to-image`

### Original bug

The package resolved at runtime but did not type-check cleanly.

### What changed

A narrow local type declaration was added:

- `src/types/html-to-image.d.ts`

### Why this was low risk

- no runtime logic was changed
- only the imported API surface needed for the project was typed

### Validation completed

- `./node_modules/.bin/tsc --noEmit` passes

## 10. Feed hook became brittle after server auth hardening

### Original bug

After the route-level auth hardening, `usePersonalizedFeed` could surface generic `Feed request failed: <status>` errors, especially around session hydration or temporary `401` responses.

Affected file:

- `src/hooks/usePersonalizedFeed.ts`

### What changed

The hook was updated to:

- stop sending the old spoofable `x-user-id` header
- wait for auth loading to finish before fetching
- retry once after `supabase.auth.refreshSession()` on `401`
- surface the API's actual error message when available

### Why this was low risk

- it did not alter the server auth model
- it aligned the client with the already-correct cookie-based auth flow
- retry logic is limited to a single refresh attempt

### Validation completed

- `npm run lint` passes
- `./node_modules/.bin/tsc --noEmit` passes

## Files changed during the fix pass

Core auth-safe route and helper updates:

- `src/utils/supabase-server.ts`
- `src/middleware.ts`
- `src/app/auth/callback/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/messages/read/route.ts`
- `src/app/api/feed/route.ts`
- `src/app/api/chat-categories/route.ts`
- `src/app/api/conversation-categories/route.ts`
- `src/app/api/recommendations/route.ts`

Messaging UI and types:

- `src/types/messaging.ts`
- `src/components/chat/ChatPage.tsx`
- `src/components/chat/ChatRequestApproval.tsx`
- `src/app/api/messages/[messageId]/route.ts`

Feed client stability:

- `src/hooks/usePersonalizedFeed.ts`

Type support:

- `src/types/html-to-image.d.ts`

## What was verified live

Verified with disposable users, seeded data, and real session cookies:

- protected read routes reject forged `x-user-id`
- pending conversation filter returns the correct pending conversation
- unread conversation filter returns the correct unread conversation
- category filter returns the correct categorized conversation
- feed chronological fallback excludes ranked cached post IDs
- merged notifications pagination returns the correct mixed ordering across pages
- notifications HEAD unread count matches the seeded unread total
- authenticated `/messages` page access succeeds

## Checks run

Passed:

- `npm run lint`
- `./node_modules/.bin/tsc --noEmit`

Also verified earlier during the fix pass:

- message item endpoints now return auth errors instead of missing-route `404`
- protected-route redirect handling preserves deep-link query params

## Remaining caution areas

Not because the fixes are known-bad, but because they are the most behavior-sensitive areas:

- full browser-mounted QA for the pending-request chat component, because that component is not currently active on a routed page
- end-to-end OAuth provider callback testing with a disposable external login round-trip
- optional cleanup of seeded disposable `bugverify.*@example.com` data after verification

## Recommended regression checklist

Before merging or deploying, verify:

- anonymous users cannot access protected API reads
- authenticated users can still load feed, notifications, conversations, and unread counts
- sender and recipient pending-chat states remain correct
- message item edit/delete still enforce ownership
- notification pagination has no skips across sources
- login redirects preserve deep links and query params
- failed profile bootstrap never leaves a user partially signed in
- ranked posts do not reappear in chronological fallback
- `npm run lint` passes
- `./node_modules/.bin/tsc --noEmit` passes
