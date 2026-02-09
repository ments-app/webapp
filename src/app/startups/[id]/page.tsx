"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StartupProfileView } from '@/components/startups/StartupProfileView';
import { fetchStartupById, bookmarkStartup, unbookmarkStartup, recordView, StartupProfile } from '@/api/startups';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StartupDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchStartupById(id, user?.id);
      if (error) {
        setError(error.message);
      } else {
        setStartup(data);
      }
      setLoading(false);

      // Record view (fire and forget)
      if (data && data.owner_id !== user?.id) {
        recordView(id, user?.id);
      }
    };
    load();
  }, [id, user?.id]);

  const handleBookmark = async () => {
    if (!user || !startup) return;
    await bookmarkStartup(user.id, startup.id);
    setStartup(prev => prev ? { ...prev, is_bookmarked: true } : prev);
  };

  const handleUnbookmark = async () => {
    if (!user || !startup) return;
    await unbookmarkStartup(user.id, startup.id);
    setStartup(prev => prev ? { ...prev, is_bookmarked: false } : prev);
  };

  const isOwner = user?.id === startup?.owner_id;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Link href="/startups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Startups
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        ) : startup ? (
          <StartupProfileView
            startup={startup}
            isOwner={isOwner}
            onBookmark={handleBookmark}
            onUnbookmark={handleUnbookmark}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">Startup not found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
