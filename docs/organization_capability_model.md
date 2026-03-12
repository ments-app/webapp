# Organization, Investor, and Startup Capability Model

This document defines how Ments should support:

- one-click Google auth with explorer-default onboarding
- additive capabilities instead of hard account types
- investor onboarding and verification
- organization onboarding for incubators, accelerators, e-cells, college incubators, facilitators, and similar support bodies
- startup-to-organization applications and accepted startup listings

It is grounded in the current codebase:

- [onboarding page](/Users/ayushmansingh/code/mentswebapp/webapp/src/app/onboarding/page.tsx)
- [onboarding API](/Users/ayushmansingh/code/mentswebapp/webapp/src/app/api/onboarding/route.ts)
- [user type overhaul migration](/Users/ayushmansingh/code/mentswebapp/webapp/supabase/migrations/010_user_type_overhaul.sql)
- [startup profile migration](/Users/ayushmansingh/code/mentswebapp/webapp/supabase/migrations/015_org_projects.sql)

## Current Product Truth

Today the platform already behaves closest to this model:

- auth is identity only
- a `users` row is created after Google login
- onboarding captures interest, not a deep role commitment
- investor is already an additive flow via `investor_status`
- founder capability is effectively derived from owning a `startup_profile`

What is missing is a first-class organization entity and an org-to-startup admissions relationship.

## Core Principle

Do not make users pick a permanent role at login.

Use this layering:

1. `auth.users`
   Identity from Google
2. `public.users`
   Person profile used across the app
3. Capability tables / entity ownership
   - startup owner or team member
   - investor applicant / verified investor
   - organization admin / reviewer

One person can be all of these at once.

## Recommended Data Model

### Keep `users` as the root identity

`users` should continue to represent the person, not the business entity.

Recommended meaning of current fields:

- `user_type`: legacy compatibility only, do not use as the primary permission model
- `primary_interest`: personalization only
- `investor_status`: investor access state

Recommended direction:

- keep `primary_interest`
- keep `investor_status`
- do not introduce `organization` as another single-value `user_type`
- derive founder capability from startup ownership
- derive org-admin capability from membership in an organization

## New Tables

### 1. `organizations`

Represents incubators, accelerators, e-cells, college incubators, facilitators, venture studios, grant bodies, or similar support organizations.

```sql
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  org_type text not null check (
    org_type in (
      'incubator',
      'accelerator',
      'ecell',
      'college_incubator',
      'facilitator',
      'venture_studio',
      'grant_body',
      'community',
      'other'
    )
  ),
  short_bio text,
  description text,
  website text,
  contact_email text,
  logo_url text,
  banner_url text,
  city text,
  state text,
  country text,
  university_name text,
  sectors text[] default '{}',
  stage_focus text[] default '{}',
  support_types text[] default '{}',
  is_verified boolean not null default false,
  is_published boolean not null default false,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_org_type on public.organizations(org_type);
create index idx_organizations_created_by on public.organizations(created_by);
create index idx_organizations_published on public.organizations(is_published);
```

Notes:

- `created_by` is only the creator, not the only admin
- `org_type` narrows onboarding without splitting the whole app into separate systems
- `support_types` can hold values like `mentorship`, `grants`, `workspace`, `network`, `pilot_access`, `funding`

### 2. `organization_members`

Allows multiple people to manage one organization.

```sql
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'reviewer', 'editor')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index idx_organization_members_user_id on public.organization_members(user_id);
```

This is the table that answers:

- who can edit an org profile
- who can review startup applications
- how one Google account links to an incubator

### 3. `organization_programs`

Organizations often run multiple programs or cohorts. Applications should target a program, not just the org, once the system matures.

```sql
create table public.organization_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  program_type text not null check (
    program_type in ('cohort', 'incubation', 'acceleration', 'grant', 'challenge', 'fellowship', 'other')
  ),
  cohort_label text,
  description text,
  application_open_at timestamptz,
  application_close_at timestamptz,
  status text not null default 'draft' check (
    status in ('draft', 'open', 'closed', 'archived')
  ),
  visibility text not null default 'public' check (
    visibility in ('public', 'private')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organization_programs_org_id on public.organization_programs(organization_id);
create index idx_organization_programs_status on public.organization_programs(status);
```

If speed matters, this table can be phase 2. Phase 1 can allow direct org applications.

### 4. `program_applications`

Applications should mostly be startup-centric, not person-centric.

```sql
create table public.program_applications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.organization_programs(id) on delete cascade,
  startup_id uuid not null references public.startup_profiles(id) on delete cascade,
  submitted_by uuid not null references public.users(id) on delete restrict,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')
  ),
  answers jsonb not null default '{}'::jsonb,
  decision_notes text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, startup_id)
);

create index idx_program_applications_program_id on public.program_applications(program_id);
create index idx_program_applications_startup_id on public.program_applications(startup_id);
create index idx_program_applications_submitted_by on public.program_applications(submitted_by);
create index idx_program_applications_status on public.program_applications(status);
```

This is intentionally separate from the existing `applications` table because that table is job/gig recruitment-specific.

### 5. `organization_startup_relations`

This is the key table for accepted startups showing under an org profile.

```sql
create table public.organization_startup_relations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  startup_id uuid not null references public.startup_profiles(id) on delete cascade,
  program_id uuid references public.organization_programs(id) on delete set null,
  relation_type text not null check (
    relation_type in ('incubated', 'accelerated', 'partnered', 'mentored', 'funded', 'community_member')
  ),
  status text not null check (
    status in ('applied', 'accepted', 'active', 'alumni', 'rejected', 'withdrawn')
  ),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, startup_id, coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index idx_org_startup_relations_org_id on public.organization_startup_relations(organization_id);
create index idx_org_startup_relations_startup_id on public.organization_startup_relations(startup_id);
create index idx_org_startup_relations_status on public.organization_startup_relations(status);
```

How this is used:

- org profile lists startups where `status in ('accepted', 'active', 'alumni')`
- startup profile shows associated orgs
- if a program application is accepted, create or update this record

## Why Not Reuse Existing Tables

### Why not use `users` as the org profile?

Because an organization is not a person.

Problems:

- one org needs multiple admins
- org pages need program/cohort data
- org acceptance should list startups, not just followers or posts
- profile semantics become inconsistent

### Why not use `startup_profiles` for incubators?

Because a support organization is structurally different from a startup.

Current `startup_profiles` fields include:

- legal status
- founding team
- funding rounds
- pitch deck
- revenue / traction

Those are wrong as the primary model for e-cells, incubators, and facilitators.

## Relationship to Current Investor Model

The investor flow should remain additive.

Current compatible shape:

- user logs in with Google
- `users` row exists
- user is explorer by default
- if they request investor access:
  - create or update `investor_profiles`
  - set `investor_status = 'applied'`
- if approved:
  - set `investor_status = 'verified'`

This is already aligned with [supabase/migrations/010_user_type_overhaul.sql](/Users/ayushmansingh/code/mentswebapp/webapp/supabase/migrations/010_user_type_overhaul.sql).

## Recommended UX Flows

### A. First Login

Current pattern is mostly correct.

Flow:

1. Google sign-in
2. Create `users` row
3. Land on lightweight onboarding
4. Ask for interests only
5. Set `primary_interest`
6. Redirect everyone to `/`

Do not ask:

- are you an explorer
- are you an investor
- are you an incubator

at sign-up.

Those are capabilities or managed entities, not auth identities.

### B. Founder Activation

Flow:

1. User logs in
2. Clicks `Create startup`
3. Completes startup wizard
4. Startup row is created with `owner_id = user.id`
5. Founder capability is now derived from ownership

### C. Investor Activation

Flow:

1. User logs in as a normal explorer
2. Visits investor-gated startup features
3. Sees `Apply for investor access`
4. Submits investor form
5. `investor_profiles` upserted
6. `users.investor_status = 'applied'`
7. Admin reviews
8. On approval: `investor_status = 'verified'`

### D. Organization Creation

Flow:

1. User logs in
2. Clicks `Create organization`
3. Chooses org type
4. Enters minimum common fields:
   - name
   - website
   - location
   - short bio
   - contact email
   - logo / banner
5. App creates:
   - `organizations` row
   - `organization_members` row with role `owner`
6. User lands on org dashboard

### E. Organization Onboarding Narrowing

Do not ask every support body the same long form.

Use progressive onboarding:

Step 1: org type

- incubator
- accelerator
- e-cell
- college incubator
- facilitator
- other

Step 2: capabilities wanted

- public profile only
- accept startup applications
- showcase startups / alumni
- post events / resources / jobs

Step 3: conditional fields

Examples:

- incubator / accelerator
  - sectors
  - stage focus
  - cohort-based or rolling
  - funding support yes/no
- e-cell / college incubator
  - university name
  - student / campus focus
  - event-led vs incubation-led
- facilitator
  - support categories
  - who can apply

This keeps onboarding broad enough for many orgs without becoming vague.

### F. Startup Applies to Organization Program

Recommended default is startup-centric.

Flow:

1. Founder visits org or program page
2. Clicks `Apply`
3. If user owns no startup:
   - gate with `Create startup first`
4. If user owns one startup:
   - preselect it
5. If user owns multiple startups:
   - ask which startup is applying
6. User fills program answers
7. App creates `program_applications`
8. Org reviewers review in dashboard
9. If accepted:
   - update application status
   - create `organization_startup_relations`
10. Org profile now shows that startup

### G. Org Dashboard Review Flow

Flow:

1. Org admin/reviewer opens org dashboard
2. Sees incoming applications grouped by:
   - draft
   - submitted
   - under review
   - accepted
   - rejected
3. Opens application
4. Reviews startup profile + answers
5. Accepts or rejects
6. Acceptance creates the org-startup relation

## Access Control Model

### Users

Any authenticated user can:

- edit own person profile
- create a startup
- submit investor application
- create an organization

### Startup owners

Can:

- manage their own startup
- submit their startup to programs
- view their startup's application history

### Organization members

Use `organization_members` for permissions:

- `owner`
  full control
- `admin`
  manage org profile, programs, and decisions
- `reviewer`
  review applications and update statuses
- `editor`
  manage org content only

## RLS Direction

At minimum:

- public can read published organizations and public programs
- organization members can update their organization and programs
- startup owners can create applications for startups they own
- organization members with review roles can update application status
- public can read accepted / active / alumni org-startup relationships for published orgs and startups

## Migration Strategy

### Phase 1: Lowest-risk launch

Add:

- `organizations`
- `organization_members`
- `organization_startup_relations`

Product result:

- orgs get public profiles
- startups can be manually attached to orgs by admins
- org pages can show accepted / alumni startups

### Phase 2: Admissions system

Add:

- `organization_programs`
- `program_applications`

Product result:

- startups can formally apply
- orgs can review and accept
- accepted startups automatically appear under org profiles

### Phase 3: Replace text-only incubator references

Current `startup_incubators` is a plain text affiliation model.

Long-term:

- keep it for legacy data
- backfill rows into `organization_startup_relations` where possible
- eventually show first-class linked organizations instead of plain strings

## Product Rules

Use these rules consistently:

1. Authentication is never the place where role complexity lives.
2. `users` is a person.
3. `startup_profiles` is a venture.
4. `organizations` is a support body.
5. Investor access is a capability.
6. Founder access is derived from startup ownership.
7. Organization admin access is derived from org membership.
8. Program applications should attach to startups, not only people.

## Practical Recommendation

For this codebase, the safest and clearest implementation path is:

1. Keep Google login and interest onboarding as-is conceptually
2. Treat investor onboarding as a later verification flow
3. Add first-class `organizations`
4. Add `organization_members`
5. Add `organization_startup_relations`
6. Add `organization_programs` and `program_applications` after that

This gives Ments:

- simple auth
- flexible multi-role users
- proper incubator/accelerator/ecell support
- accepted startups automatically listed on org profiles
- no forced role switching

