# Image Handling — Banner & Profile Images

## Database Fields

| Entity | Avatar/Logo Field | Banner/Cover Field | Table |
|---|---|---|---|
| Users | `avatar_url` | `banner_image` | `users` |
| Environments | `picture` | `banner` | `environments` |
| Projects | `logo_url` | `cover_url` | `projects` |
| Startup Profiles | `logo_url` | `banner_url` | `startup_profiles` |
| Startup Founders | `avatar_url` | — | `startup_founders` |
| Organizations | `logo_url` | `banner_url` | `organizations` |

All fields store a **storage path** (e.g. `avatars/uuid_avatar_1711234567890.jpg`), not a full URL.

---

## Storage

All images live in the Supabase **`media`** bucket.

**Path conventions:**

| Type | Path Pattern | Example |
|---|---|---|
| User avatar | `avatars/{filename}` | `avatars/abc123_avatar_1711234567890.jpg` |
| User cover | `covers/{filename}` | `covers/abc123_cover_1711234567890.jpg` |
| Startup logo | `{user_id}/startup-logo/{filename}` | `uuid/startup-logo/logo.png` |
| Startup banner | `{user_id}/startup-banner/{filename}` | `uuid/startup-banner/banner.jpg` |

Cache-Control: `3600` (1 hour) on all uploads.

---

## URL Construction

Images go through three stages:

1. **Raw path** — stored in the database (e.g. `avatars/file.jpg`)
2. **Public URL** — generated via `supabase.storage.from('media').getPublicUrl(path)`
   → `https://<project>.supabase.co/storage/v1/object/public/media/avatars/file.jpg`
3. **Proxied/optimized URL** — via `toProxyUrl()` in `src/utils/imageUtils.ts`
   → `https://<project>.supabase.co/functions/v1/get-image?url={encoded}&w={width}&q={quality}`

The proxy edge function (`get-image`) handles server-side resizing, format conversion, and quality optimization.

**Display sizes used in `toProxyUrl()`:**

| Context | Width | Quality |
|---|---|---|
| Profile page avatar | 256px | 82% |
| Profile page cover | 1200px | 82% |
| Startup logo (recommended) | 256px | — |
| Startup banner (recommended) | 1200px | — |

CDN-hosted images (Google, Facebook, GitHub, Unsplash) bypass the proxy and are served directly.

---

## Upload Flow

### User Profile Images

**Component:** `src/components/profile/EditProfileForm.tsx`

1. User selects an image file.
2. **Client-side compression** via `compressImage()` (`src/utils/imageCompression.ts`):
   - Avatar: max 512x512, quality 0.85
   - Cover: max 1600x900, quality 0.85
   - Format priority: AVIF > WebP > JPEG
3. Optional **cropping** via `ImageCropModal` (`src/components/ui/ImageCropModal.tsx`):
   - Avatar crop: 512x512
   - Cover crop: 1600x900
4. **Upload** with fallback strategy:
   - First tries `upload-profile-image` Supabase edge function (sends base64)
   - On failure, falls back to direct `supabase.storage.from('media').upload()`
5. The returned public URL is saved to the `users` table (`avatar_url` or `banner_image`).

### Startup Images

**Component:** `src/components/startups/Step3Branding.tsx`

**API Route:** `src/app/api/startups/upload/route.ts`

1. User selects a logo or banner.
2. Upload goes to `POST /api/startups/upload` with a `category` field (`startup-logo` or `startup-banner`).
3. Stored at `{user_id}/{category}/{filename}` in the `media` bucket.
4. Max sizes: 5 MB for images, 20 MB for pitch decks.
5. Supported formats: JPEG, PNG, WebP, GIF.
6. Startup banners support a **vertical position slider** (Y offset) for display adjustment.
7. Startup logos support **X/Y position sliders** for drag-and-drop positioning.

---

## Update Flow

### Updating a User Profile Image

1. User opens the profile edit form → `EditProfileForm`.
2. Selects a new avatar or cover image.
3. The same upload flow runs (compress → optional crop → upload → save URL).
4. The new path overwrites the old `avatar_url` or `banner_image` value in the `users` table via `PATCH /api/users/[username]/profile`.
5. Old image files are **not deleted** from storage — they remain in the bucket.

### Updating a Startup Image

1. User re-uploads via the branding step.
2. New file is uploaded to the same `{user_id}/startup-{type}/` path.
3. `logo_url` or `banner_url` is updated in `startup_profiles`.

### Updating an Organization Image

**Component:** `src/components/organizations/FacilitatorProfileManager.tsx`

Organization `logo_url` and `banner_url` are currently edited as **plain text inputs** (URL strings), not through a file upload widget.

---

## Profile Page Display

**File:** `src/app/profile/[username]/page.tsx`

```
avatar  → toProxyUrl(user.avatar_url, { width: 256, quality: 82 })
cover   → toProxyUrl(user.banner_image ?? user.cover_url, { width: 1200, quality: 82 })
```

- Falls back from `banner_image` to `cover_url` if the banner is missing.
- Tracks loading errors separately for avatar and cover (shows fallback UI on error).

---

## Key Files

| File | Role |
|---|---|
| `src/components/profile/EditProfileForm.tsx` | User avatar + cover upload/edit |
| `src/components/ui/ImageCropModal.tsx` | Interactive crop before upload |
| `src/components/startups/Step3Branding.tsx` | Startup logo + banner upload |
| `src/app/api/startups/upload/route.ts` | Startup image upload API |
| `src/app/api/users/[username]/profile/route.ts` | User profile update API |
| `src/utils/imageUtils.ts` | `toProxyUrl()`, `getImageUrl()`, `getProcessedImageUrl()` |
| `src/utils/imageCompression.ts` | Client-side `compressImage()` |
| `src/utils/fileUpload.ts` | Generic `uploadMediaFile()` + `uploadPostMedia()` |
| `src/app/profile/[username]/page.tsx` | Profile page display logic |

---

## Relevant Migrations

| Migration | What it added |
|---|---|
| `000_base_schema.sql` | `avatar_url`, `banner_image` on users; `picture`, `banner` on environments; `cover_url`, `logo_url` on projects |
| `003_startup_onboarding_columns.sql` | `logo_url`, `banner_url` on startup_profiles |
| `007_founder_avatar_role.sql` | `avatar_url` on startup_founders |
| `011_auto_create_user_and_resume.sql` | Auto-populates `avatar_url` from auth metadata on user creation |
| `020_organizations_phase1.sql` | `logo_url`, `banner_url` on organizations |
