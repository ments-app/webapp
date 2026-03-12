'use client';

import type { OrganizationProfile } from '@/api/organizations';
import { getManageFacilitatorBusinessUrl } from '@/api/organizations';
import { BadgeCheck, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

function statusTone(status: OrganizationProfile['verification_status']) {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
    case 'pending':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
    case 'rejected':
      return 'border-red-500/20 bg-red-500/10 text-red-600';
    case 'suspended':
      return 'border-red-500/20 bg-red-500/10 text-red-600';
    default:
      return 'border-border/60 bg-muted/30 text-muted-foreground';
  }
}

function statusCopy(organization: OrganizationProfile) {
  switch (organization.verification_status) {
    case 'approved':
      return 'Business verification is approved. The verified badge is active anywhere this facilitator is shown publicly.';
    case 'pending':
      return 'Business verification is pending. Complete any remaining setup or review notes in business.ments.app.';
    case 'rejected':
      return organization.verification_rejection_reason || 'Business verification was rejected. Open business.ments.app to review notes and update your submission.';
    case 'suspended':
      return organization.verification_rejection_reason || 'This facilitator is currently suspended on the business side. Review status and next steps in business.ments.app.';
    default:
      return 'Business verification and facilitator approval are managed in business.ments.app, not in this app.';
  }
}

export function FacilitatorVerificationCard({
  organization,
}: {
  organization: OrganizationProfile;
}) {
  return (
    <section className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Business Verification
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Business-side setup</h2>
          <p className="mt-1 text-sm text-muted-foreground">{statusCopy(organization)}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusTone(organization.verification_status)}`}>
          {organization.verification_status === 'approved' ? <BadgeCheck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {organization.verification_status.replace(/_/g, ' ')}
        </div>
      </div>

      {organization.verification_reviewed_at && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Last reviewed on {new Date(organization.verification_reviewed_at).toLocaleDateString()}
        </div>
      )}

      <div className="flex justify-end">
        <a
          href={getManageFacilitatorBusinessUrl('/startups?tab=facilitators')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Open in business.ments.app
        </a>
      </div>
    </section>
  );
}
