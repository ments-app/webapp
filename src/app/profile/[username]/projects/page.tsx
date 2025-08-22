"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

export default function UserProjectsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  type ProjectItem = {
    id: string;
    title?: string | null;
    name?: string | null;
    tagline?: string | null;
    description?: string | null;
    status?: string | null;
    url?: string | null;
  };
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/projects`);
        if (!res.ok) throw new Error('Failed to load projects');
        const json = await res.json();
        if (!cancelled) setItems(json?.data ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load projects';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (username) run();
    return () => { cancelled = true; };
  }, [username]);

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-2xl font-semibold text-white">{username}&apos;s Projects</h1>
            <Link href={`/profile/${encodeURIComponent(username)}`} className="text-sm text-muted-foreground hover:text-foreground">Back to Profile</Link>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No projects yet.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {items.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-foreground">{p.title || p.name || 'Untitled Project'}</div>
                      {p.tagline || p.description ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.tagline || p.description}</p>
                      ) : null}
                    </div>
                    {p.status && (
                      <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">{p.status}</span>
                    )}
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary hover:underline">Visit</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
