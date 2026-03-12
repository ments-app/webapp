'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { fetchOrganizations, getCreateFacilitatorRedirectUrl } from '@/api/organizations';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';

export default function CreateOrganizationPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;

    const resolveDestination = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await fetchOrganizations({ mine: true });
        if (data.length > 0) {
          router.replace(`/organizations/${data[0].slug}/dashboard`);
          return;
        }

        const redirectUrl = getCreateFacilitatorRedirectUrl('/startups?tab=facilitators');
        setTargetUrl(redirectUrl);
        window.location.assign(redirectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to prepare facilitator setup');
      } finally {
        setLoading(false);
      }
    };

    resolveDestination();
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">Please sign in to continue to startup facilitator setup.</p>
          <Link href="/organizations" className="mt-4 text-sm font-medium text-primary">Back to startup facilitators</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to startup facilitators
        </Link>

        <div className="rounded-3xl border border-border/50 bg-card p-6 sm:p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Startup facilitator setup lives in business.ments.app</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Facilitator creation and business verification are managed in the business app. After setup there, you will come back here to manage the in-app profile and startup assignments.
          </p>

          {loading ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to business.ments.app...
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {error && <p className="text-sm text-red-500">{error}</p>}
              {targetUrl && (
                <a
                  href={targetUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  Continue in business.ments.app
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
