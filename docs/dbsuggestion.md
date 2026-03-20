# Database Schema — Suggestions & Redundancies

## 1. Facilitator / Organization Identity Crisis

**Problem:** Two parallel systems exist for the same concept.

**Old system (business.ments.app):**
- `admin_profiles` — role can be `'superadmin' | 'facilitator' | 'startup'`
- `facilitator_profiles` — extends `admin_profiles` with org details (name, address, type, POC)
- FK'd to `auth.users` (separate auth identity from the main `public.users`)

**New system:**
- `organizations` — has `org_type` including `'incubator' | 'accelerator' | 'ecell' | 'facilitator'`
- `organization_members` — role-based access (`owner | admin | reviewer | editor`)
- `organization_startup_relations` — rich relationship tracking

**Confusion:** Both systems reference `startup_profiles` via FKs. Jobs, gigs, events, competitions all have BOTH `facilitator_id -> admin_profiles` AND `startup_id -> startup_profiles`. Meanwhile `organizations` also tracks startup relations separately.

**Recommendation:** Pick one. The `organizations` system is the newer, better-designed one. Migrate `facilitator_profiles` data into `organizations` and deprecate `admin_profiles` + `facilitator_profiles`. For business.ments.app, use `organization_members.role` to gate access instead of a separate `admin_profiles` table.

---

## 2. Duplicated Showcase Tables (Projects vs Startups)

**Problem:** Identical table pairs with near-identical columns:

| Startup Table | Project Table | Shared Structure |
|---|---|---|
| `startup_slides` | `project_slides` | `id, *_id, slide_url, caption, slide_number, created_at` |
| `startup_links` | `project_links` | `id, *_id, title, url, icon_name, display_order, created_at` |
| `startup_text_sections` | `project_text_sections` | `id, *_id, heading, content, display_order, created_at` |
| `startup_upvotes` | `project_upvotes` | `*_id, user_id, created_at` |

Additionally, `startup_profiles.entity_type` can be `'org_project'` — so org projects live in the startups table too.

**Recommendation:** Either:
- **(A)** Create polymorphic `entity_slides`, `entity_links`, `entity_text_sections` tables with `entity_type` + `entity_id`, OR
- **(B)** Keep them separate but don't also store org projects inside `startup_profiles`.

Remove `entity_type = 'org_project'` from `startup_profiles`. Org projects should be `projects` owned by an organization.

---

## 3. User Identity / Role Fragmentation

**Problem:** A single user's "type" is scattered across 6+ places:

| Location | What it stores |
|---|---|
| `users.user_type` | `'normal_user' | 'mentor' | 'founder' | 'investor' | 'explorer'` |
| `users.primary_interest` | `'exploring' | 'building' | 'investing'` |
| `users.investor_status` | `'none' | 'applied' | 'verified' | 'rejected'` |
| `users.role` | `'user' | 'admin' | 'super_admin'` |
| `founder_profiles` | Separate table for founder-specific data |
| `investor_profiles` | Separate table for investor-specific data |
| `admin_profiles` | Separate table for admin/facilitator identity |
| `organization_members` | Org-level role (`owner | admin | reviewer | editor`) |

**Issues:**
- `user_type = 'founder'` AND `founder_profiles` are redundant — need both in sync or queries break
- `user_type = 'investor'` AND `investor_status` AND `investor_profiles` — three sources of truth
- `users.role = 'admin'` AND `admin_profiles` — two places to check admin status
- `primary_interest` overlaps with `user_type` conceptually

**Recommendation:**
- Keep `founder_profiles` and `investor_profiles` as source of truth. Drop `user_type` or make it computed/derived
- Merge `primary_interest` into onboarding UX only — don't persist it if `user_type` exists
- Move `investor_status` to `investor_profiles`, remove from `users`
- `users.role` should be the only admin check; kill `admin_profiles.role` or vice versa

---

## 4. Dual Audit Log Tables

**Problem:** Two tables serve the same purpose:

- `admin_audit_log` — FK to `users(id)`, has `action, target_type, target_id, details`
- `audit_logs` — no FK, has `action_type, actor_id, actor_role, target_type, target_id, details, ip_address`

`audit_logs` is the better version (captures `actor_role`, `ip_address`).

**Recommendation:** Drop `admin_audit_log`. Use `audit_logs` for everything and filter by `actor_role` when you need admin-only audits.

---

## 5. Denormalized User Data in `applications`

**Problem:** The `applications` table stores:

```sql
user_name text,
user_email text,
user_avatar_url text,
user_tagline text,
user_city text,
profile_snapshot jsonb
```

The first 5 columns duplicate `users` data AND `profile_snapshot` jsonb already captures point-in-time snapshots. Same data stored twice within the same row.

**Recommendation:** Keep `profile_snapshot` (correct for application-time snapshots). Drop the individual `user_name`, `user_email`, `user_avatar_url`, `user_tagline`, `user_city` columns — read them from the jsonb or join to `users` for current data.

---

## 6. `startup_founders` vs `founder_profiles` Naming Confusion

**Problem:** Two completely different concepts with confusing names:

- `founder_profiles` — a user-level profile (1:1 with `users`), stores pitch, stage, looking_for
- `startup_founders` — a team roster entry for a specific startup (M:N between users and startups)

A founder can have a `founder_profiles` entry AND be in `startup_founders`. Their `stage`, `company_name`, and `is_actively_raising` might differ between the two.

**Recommendation:** Rename `founder_profiles` to `builder_profiles` or `entrepreneur_profiles` to avoid confusion. Make startup-specific data authoritative from `startup_profiles`, not duplicated in `founder_profiles`.

---

## 7. `facilitator_student_emails` — Orphaned Design

**Problem:**

```sql
facilitator_student_emails
  facilitator_id -> auth.users(id)  -- points to auth, not public.users or admin_profiles
```

References `auth.users` directly while most other tables reference `public.users`. It's also the only table handling email-based access control for facilitators, disconnected from the `organizations` system which has its own member/relation tracking.

**Recommendation:** If organizations are the future, move this to an `organization_invites` or `organization_allowed_emails` table that references `organizations(id)`.

---

## 8. Visibility / Access Control is Inconsistent

**Problem:** Every content type handles visibility differently:

| Table | Visibility Field |
|---|---|
| `startup_profiles` | `visibility: 'public' | 'investors_only' | 'private'` + `is_published` |
| `projects` | `visibility: 'public' | 'private' | 'unlisted'` |
| `jobs` | `visibility: 'public' | 'facilitator_only'` + `target_facilitator_ids` |
| `gigs` | `visibility: 'public' | 'email_restricted' | 'facilitator_only'` + `target_facilitator_ids` |
| `events` | `visibility` (no CHECK constraint) + `target_facilitator_ids` |
| `competitions` | `visibility` (no CHECK constraint) + `target_facilitator_ids` |

**Issues:**
- `events` and `competitions` have `visibility text NOT NULL DEFAULT 'public'` with **no CHECK constraint** — any string is valid
- `target_facilitator_ids` is a denormalized array on 4 tables — no referential integrity, no cascade on facilitator deletion
- `startup_profiles` uses `is_published` as a separate boolean on top of `visibility` — confusing

**Recommendation:**
- Add CHECK constraints to `events.visibility` and `competitions.visibility`
- Standardize the visibility enum across all content types
- Either `is_published` OR `visibility = 'private'` — not both. Pick one pattern.

---

## 9. Missing FKs / Dangling References

| Table | Column | Issue |
|---|---|---|
| `startup_bookmarks` | `user_id` | No FK to `users(id)` — only has FK to `startup_profiles` |
| `startup_profiles` | `owner_id` | No FK defined — should reference `users(id)` |
| `audit_logs` | `actor_id` | No FK — intentional for flexibility but risky |
| `events` | `created_by` | FK -> `auth.users(id)` not `public.users(id)` — inconsistent |
| `event_audience` | `user_id` | No FK defined |
| `event_stalls` | `user_id` | No FK defined |

**Recommendation:** Add missing FKs. Standardize on `public.users(id)` unless there's a specific reason to use `auth.users(id)`.

---

## 10. Priority Actions Summary

| Priority | Action |
|---|---|
| **HIGH** | Unify facilitator identity: deprecate `admin_profiles` + `facilitator_profiles`, use `organizations` |
| **HIGH** | Fix missing CHECK constraints on `events.visibility`, `competitions.visibility` |
| **HIGH** | Remove `entity_type = 'org_project'` from `startup_profiles` — org projects should be `projects` |
| **MEDIUM** | Consolidate `user_type` / `primary_interest` / `investor_status` — single source of truth |
| **MEDIUM** | Drop `admin_audit_log`, use `audit_logs` only |
| **MEDIUM** | Drop denormalized user columns from `applications` (keep `profile_snapshot`) |
| **MEDIUM** | Add missing FKs on `startup_bookmarks.user_id`, `startup_profiles.owner_id`, etc. |
| **LOW** | Rename `founder_profiles` to avoid confusion with `startup_founders` |
| **LOW** | Consider polymorphic showcase tables (slides/links/text_sections) to reduce duplication |
| **LOW** | Migrate `facilitator_student_emails` to organization-based access control |
