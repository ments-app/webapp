"use client";

import { use, useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toProxyUrl } from '@/utils/imageUtils';
import { ArrowLeft, Search, MapPin, Users } from 'lucide-react';
import { notFound, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Row = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  is_following?: boolean;
  about?: string | null;
  tagline?: string | null;
  current_city?: string | null;
  user_type?: string | null;
  followers_count?: number;
};

const USER_TYPE_LABELS: Record<string, string> = {
  founder: 'Founder',
  mentor: 'Mentor',
  investor: 'Investor',
  explorer: 'Explorer',
};

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export default function FollowersPage({ params }: { params: Promise<{ username?: string }> }) {
  const resolved = use(params);
  const username = (resolved?.username || '').trim();
  const router = useRouter();
  const { user: viewer } = useAuth();
  const viewerId = viewer?.id ?? null;

  if (!username) notFound();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [followPending, setFollowPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = viewerId ? `?viewerId=${viewerId}` : '';
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/followers${qs}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!cancelled) setRows(Array.isArray(json?.data) ? json.data : []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [username, viewerId]);

  const list = useMemo(() => {
    let filtered = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = rows.filter(u =>
        u.username.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase() || '').includes(q) ||
        (u.tagline?.toLowerCase() || '').includes(q)
      );
    }
    return filtered.slice().sort((a, b) => {
      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
      return (a.full_name || a.username).localeCompare(b.full_name || b.username);
    });
  }, [rows, searchQuery]);

  const handleFollowToggle = useCallback(async (user: Row, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewerId || followPending[user.id]) return;

    const newState = !user.is_following;
    setRows(prev => prev.map(r => r.id === user.id ? { ...r, is_following: newState } : r));
    setFollowPending(prev => ({ ...prev, [user.id]: true }));

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: viewerId, follow: newState }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(prev => prev.map(r => r.id === user.id ? { ...r, is_following: !newState } : r));
    } finally {
      setFollowPending(prev => ({ ...prev, [user.id]: false }));
    }
  }, [viewerId, followPending]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Followers</h1>
            <p className="text-xs text-muted-foreground">People who follow @{username}</p>
          </div>
        </div>

        {/* Search */}
        {!loading && rows.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted/30 border border-border/30 rounded-xl outline-none focus:border-primary/30 focus:bg-muted/40 transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground/60">Loading people...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground mb-3">Something went wrong</p>
            <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/70 mb-1">
              {searchQuery.trim()
                ? 'No one found'
                : 'No followers yet'
              }
            </p>
            <p className="text-xs text-muted-foreground/60">
              {searchQuery.trim()
                ? `No results matching "${searchQuery}"`
                : 'When people follow this account, they\'ll show up here.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((u) => {
              const isOwnProfile = viewerId === u.id;
              const initial = (u.full_name || u.username).charAt(0).toUpperCase();
              const bio = u.tagline || u.about;
              const typeLabel = u.user_type ? USER_TYPE_LABELS[u.user_type] : null;

              return (
                <Link
                  key={u.id}
                  href={`/profile/${encodeURIComponent(u.username)}`}
                  className="flex items-start gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/40 active:scale-[0.995] transition-all"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-border/20">
                      {u.avatar_url ? (
                        <Image
                          src={toProxyUrl(u.avatar_url, { width: 48, quality: 80 })}
                          alt="" width={48} height={48}
                          className="w-full h-full object-cover" loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <span className="text-base font-bold text-primary">{initial}</span>
                        </div>
                      )}
                    </div>
                    {u.is_verified && (
                      <Image
                        src="/icons/verify_badge.svg" alt="Verified"
                        width={16} height={16}
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {u.full_name || u.username}
                      </p>
                      {typeLabel && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                          {typeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/70 truncate">@{u.username}</p>
                    {bio && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{bio}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {typeof u.followers_count === 'number' && (
                        <span className="text-[11px] text-muted-foreground/60">
                          <span className="font-medium text-foreground/70">{formatCount(u.followers_count)}</span> followers
                        </span>
                      )}
                      {u.current_city && (
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {u.current_city}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Follow button */}
                  {viewerId && !isOwnProfile && (
                    <button
                      onClick={(e) => handleFollowToggle(u, e)}
                      disabled={followPending[u.id]}
                      className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all flex-shrink-0 mt-1 ${
                        u.is_following
                          ? 'bg-muted/50 text-muted-foreground border border-border/30 hover:border-red-500/30 hover:text-red-500'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      } ${followPending[u.id] ? 'opacity-50' : ''}`}
                    >
                      {u.is_following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
