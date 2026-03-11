# Login UX Audit — Shared Profile & Post URLs

**Date:** 2026-03-08
**Scope:** All UI/UX issues when unauthenticated users access shared profile URLs, post URLs, and other public-facing pages.

---

## Executive Summary

When a user shares their Ments profile link (`/profile/[username]`) or a post link (`/post/[postId]`) with someone who is **not logged in**, the recipient encounters multiple UX problems:

1. **No login modal or prompt exists** — the app has no reusable `LoginPromptModal` component.
2. Interactive elements either silently fail, show ugly `alert()` dialogs, or display inline error text.
3. Action buttons (Follow, Message) are **completely hidden** instead of showing a clear "Sign in" call-to-action.
4. The reply composer on post pages is **fully visible and interactive** but errors out on submit.
5. The middleware performs **zero authentication-based route protection** — no redirect to login for protected pages.

---

## Issue 1: No Global Login Prompt Component

**Severity:** Critical (Architectural Gap)
**Files:** Entire codebase

The app has **no `LoginPromptModal`, `AuthGate`, or equivalent component**. Every file that needs to handle unauthenticated interactions implements its own ad-hoc solution (alert, inline error, hidden buttons, disabled state). This leads to wildly inconsistent UX.

**Expected behavior:** A shared, reusable modal that says something like *"Sign in to continue"* with a Google Sign-In button, triggered whenever an unauthenticated user attempts a protected action.

---

## Issue 2: Browser `alert()` on Poll Vote

**Severity:** High
**File:** `src/components/posts/PostCard.tsx`
**Line:** 801–804

```typescript
if (!user?.id) {
  alert('Sign in to vote on polls.');
  return;
}
```

**Problem:** When an unauthenticated user taps a poll option on a shared post, they see a raw browser `alert()` dialog. This is:
- Visually jarring and unprofessional
- Not actionable (no sign-in button in the alert)
- Inconsistent with the rest of the app's design language

**Additional context:** Line 1330–1332 shows a subtle hint `"· sign in to vote"` below the poll, but it is low-contrast (`opacity-60`) and easy to miss.

**Recommendation:** Replace `alert()` with a `LoginPromptModal` that includes a Google Sign-In button.

---

## Issue 3: Reply Composer Visible But Non-Functional

**Severity:** High
**File:** `src/app/post/[postId]/page.tsx`
**Lines:** 167–169 (error logic), 332–408 (composer UI)

```typescript
// Line 167-169: Error on submit
if (!user?.id) {
  setError("You must be logged in to reply.");
  return;
}
```

**Problem:** The fixed-bottom reply composer (lines 332–408) renders for **all users**, including unauthenticated ones:
- The avatar placeholder shows "U" (line 339)
- The input field is enabled and accepts text input
- The "Add content" button is clickable
- Only after typing and pressing Enter/submit does the user see a small red error: *"You must be logged in to reply."*

**This is a bait-and-switch UX pattern** — users invest effort typing a reply only to be told they can't submit it.

**Recommendation:**
- Replace the composer with a banner: *"Sign in to reply to this post"* + Sign-In button, OR
- Show the composer in a disabled/locked state with a clear overlay prompting sign-in.

---

## Issue 4: Profile Action Buttons Completely Hidden

**Severity:** High
**File:** `src/app/profile/[username]/page.tsx`
**Lines:** 416–426

```typescript
) : viewerId && data?.user?.id ? (
  <>
    <Button onClick={handleToggleFollow} ...>
      {data?.viewer?.is_following ? 'Following' : 'Follow'}
    </Button>
    <Button onClick={handleMessage} ...>
      <MessageCircle ... />
    </Button>
  </>
) : null  // <-- renders NOTHING for unauthenticated users
```

**Problem:** When an unauthenticated user visits a shared profile URL (`/profile/johndoe`):
- The **Follow** button is completely absent
- The **Message** button is completely absent
- There is **no indication** that these actions exist or that signing in would unlock them
- The profile looks "flat" with no interactivity

**Recommendation:** Show the Follow and Message buttons in their normal position but have them trigger a `LoginPromptModal` when clicked.

---

## Issue 5: Follow/Message Handlers Silently Fail

**Severity:** Medium
**File:** `src/app/profile/[username]/page.tsx`
**Lines:** 223–224, 268–269

```typescript
// Follow handler - silent early return
const handleToggleFollow = async () => {
  if (!viewerId || !data?.user?.id) return; // silently does nothing
  ...
};

// Message handler - silent early return
const handleMessage = async () => {
  if (!viewerId || !data?.user?.id) return; // silently does nothing
  ...
};
```

**Problem:** Even if buttons were visible, clicking them would do **nothing** — no error, no feedback, no redirect.

**Recommendation:** Add login prompt trigger before the early return.

---

## Issue 6: No Middleware Auth Guards for Protected Pages

**Severity:** High (Architectural Gap)
**File:** `src/middleware.ts`
**Lines:** 51–146

The middleware handles:
- Rate limiting for `/api/` routes (lines 53–63)
- Account status checks for deactivated/deleted/suspended users (lines 102–139)

**What it does NOT do:**
- No authentication checks for protected page routes
- No redirect to `/` (login page) for unauthenticated access to `/messages`, `/settings`, `/profile/edit`, `/create`, etc.
- Unauthenticated users can navigate to any page and see the full DashboardLayout

**Impact:** Users who receive a link to `/messages/[id]` or `/settings` will see a broken, empty dashboard instead of being redirected to sign in.

**Recommendation:** Add a protected routes list in middleware that redirects unauthenticated users to `/` with a `?redirect=` parameter to return them after login.

---

## Issue 7: Startup Pages Show "Please sign in" Plain Text

**Severity:** Medium
**Files & Lines:**
- `src/app/startups/page.tsx:165`
- `src/app/startups/my/page.tsx:54`
- `src/app/startups/create/page.tsx:24`

```typescript
<p className="text-muted-foreground">Please sign in to view startups.</p>
<p className="text-muted-foreground">Please sign in to manage your startup.</p>
<p className="text-muted-foreground">Please sign in to create a startup profile.</p>
```

**Problem:** These pages show plain text messages asking users to sign in, but:
- No sign-in button or link is provided
- The text is low-contrast (`text-muted-foreground`)
- Users have no clear path to actually sign in from these pages

**Recommendation:** Replace with a card component containing a heading, explanation, and Google Sign-In button.

---

## Issue 8: Post Creation Error Message

**Severity:** Medium
**Files & Lines:**
- `src/components/posts/CreatePostInput.tsx:667–670`
- `src/components/posts/CreatePostForm.tsx:220–223`

```typescript
if (!user) {
  setError('You must be logged in to create a post');
  return;
}
```

**Problem:** If an unauthenticated user somehow reaches the create post UI, they can fill out the entire form and only see an error on submit. The error is a small inline red text, not a clear prompt.

**Recommendation:** The create post page should redirect to login via middleware (Issue 6 fix), and the component should show a full-page login prompt as a fallback.

---

## Issue 9: Hub/Event Join Buttons — Disabled Without Context

**Severity:** Medium
**Files & Lines:**
- `src/app/hub/[id]/page.tsx:492–494`
- `src/app/hub/event/[id]/page.tsx:376–378`
- `src/app/hub/page.tsx:318, 448, 577`

```typescript
<button
  disabled={joining || checkingJoin || !user}
  title={!user ? 'Sign in to join' : undefined}
>
```

**Problem:**
- Buttons are disabled for unauthenticated users
- The only hint is a browser `title` tooltip (hover-only, invisible on mobile)
- No visible text or badge explains why the button is disabled
- On mobile/touch devices, tooltips don't appear at all

**Recommendation:** Show visible text like *"Sign in to join"* below or instead of the disabled button, or make the button clickable and trigger a login modal.

---

## Issue 10: Profile Edit Redirects to Non-Existent Route

**Severity:** Low
**File:** `src/app/profile/edit/page.tsx:16`

```typescript
router.replace('/auth/login');
```

**Problem:** The profile edit page redirects unauthenticated users to `/auth/login`, but the app uses `/` as the login page (Google OAuth flow starts from the homepage). This may result in a 404 or blank page.

**Recommendation:** Update redirect target to `/` or the actual login route.

---

## Summary Table

| # | Issue | Severity | File(s) | Current Behavior | Expected Behavior |
|---|-------|----------|---------|-----------------|-------------------|
| 1 | No login prompt component | Critical | — | N/A | Reusable `LoginPromptModal` |
| 2 | `alert()` on poll vote | High | PostCard.tsx:803 | Browser alert | Login modal |
| 3 | Reply composer visible but broken | High | post/[postId]/page.tsx:332-408 | Type → error on submit | Locked state or login banner |
| 4 | Profile buttons hidden | High | profile/[username]/page.tsx:416-426 | Buttons render `null` | Show buttons → trigger login |
| 5 | Follow/Message silent fail | Medium | profile/[username]/page.tsx:223,268 | Silent early return | Login prompt |
| 6 | No middleware auth guards | High | middleware.ts | No protection | Redirect to login |
| 7 | Plain "sign in" text on startups | Medium | startups/*.tsx | Text-only message | Card with sign-in button |
| 8 | Post creation inline error | Medium | CreatePostInput/Form.tsx | Error on submit | Redirect or full-page prompt |
| 9 | Disabled hub buttons (tooltip-only) | Medium | hub/*.tsx | Disabled + tooltip | Visible text or login modal |
| 10 | Wrong login redirect route | Low | profile/edit/page.tsx:16 | `/auth/login` (may 404) | `/` |

---

## Recommended Fix Strategy

### Phase 1: Create Shared Login Prompt (fixes Issues 1, 2, 3, 5, 9)
1. Build a `LoginPromptModal` component using the existing `signInWithGoogle()` from `AuthContext`
2. Accept props: `title`, `description`, `trigger` (what action was attempted)
3. Integrate into all interactive elements that require auth

### Phase 2: Middleware Auth Guards (fixes Issues 6, 8, 10)
1. Define a `PROTECTED_ROUTES` array in middleware: `/messages`, `/settings`, `/profile/edit`, `/create`, etc.
2. Redirect unauthenticated users to `/?redirect={originalPath}`
3. After login, redirect back to the original URL
4. Fix `/auth/login` reference to `/`

### Phase 3: Profile & Post Page Polish (fixes Issues 3, 4, 7)
1. Show Follow/Message buttons on profiles for unauthenticated users (trigger login on click)
2. Replace reply composer with login banner for unauthenticated users on post pages
3. Replace plain-text "sign in" messages on startup pages with styled cards containing sign-in buttons
