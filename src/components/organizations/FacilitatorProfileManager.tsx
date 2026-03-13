'use client';

import { useState } from 'react';
import type { OrganizationProfile } from '@/api/organizations';
import { updateOrganizationProfile } from '@/api/organizations';
import { Building2, Loader2, Save } from 'lucide-react';

function tagsToText(value: string[]) {
  return value.join(', ');
}

function textToTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function FacilitatorProfileManager({
  organization,
  onUpdate,
}: {
  organization: OrganizationProfile;
  onUpdate: (next: OrganizationProfile) => void;
}) {
  const [form, setForm] = useState({
    short_bio: organization.short_bio || '',
    description: organization.description || '',
    website: organization.website || '',
    contact_email: organization.contact_email || '',
    logo_url: organization.logo_url || '',
    banner_url: organization.banner_url || '',
    city: organization.city || '',
    state: organization.state || '',
    country: organization.country || '',
    university_name: organization.university_name || '',
    sectors: tagsToText(organization.sectors),
    stage_focus: tagsToText(organization.stage_focus),
    support_types: tagsToText(organization.support_types),
    is_published: organization.is_published,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const { data } = await updateOrganizationProfile(organization.slug, {
        ...form,
        sectors: textToTags(form.sectors),
        stage_focus: textToTags(form.stage_focus),
        support_types: textToTags(form.support_types),
      });
      onUpdate(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update facilitator profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Building2 className="h-3.5 w-3.5" />
          Public Profile
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">App-facing organization profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how this organization appears inside the app. Business verification stays on business.ments.app for facilitator-managed orgs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-foreground">Short bio</label>
          <input
            value={form.short_bio}
            onChange={(e) => setForm((prev) => ({ ...prev, short_bio: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Contact email</label>
          <input
            value={form.contact_email}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Logo URL</label>
          <input
            value={form.logo_url}
            onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Banner URL</label>
          <input
            value={form.banner_url}
            onChange={(e) => setForm((prev) => ({ ...prev, banner_url: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">City</label>
          <input
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">State</label>
          <input
            value={form.state}
            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Country</label>
          <input
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">University / institution</label>
          <input
            value={form.university_name}
            onChange={(e) => setForm((prev) => ({ ...prev, university_name: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-foreground">Sectors</label>
          <input
            value={form.sectors}
            onChange={(e) => setForm((prev) => ({ ...prev, sectors: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Stage focus</label>
          <input
            value={form.stage_focus}
            onChange={(e) => setForm((prev) => ({ ...prev, stage_focus: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Support types</label>
          <input
            value={form.support_types}
            onChange={(e) => setForm((prev) => ({ ...prev, support_types: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="md:col-span-2 rounded-2xl border border-border/60 px-4 py-3">
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
              className="h-4 w-4"
            />
            Publish this organization profile in the app
          </label>
        </div>

        {error && <p className="md:col-span-2 text-sm text-red-500">{error}</p>}
        {saved && !error && <p className="md:col-span-2 text-sm text-emerald-600">Profile saved.</p>}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}
