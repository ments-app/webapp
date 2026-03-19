"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, MapPin, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toProxyUrl } from '@/utils/imageUtils';

type Row = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  is_following?: boolean;
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

interface FollowersPopupProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  viewerId: string | null;
  initialTab: 'followers' | 'following';
  followersCount: number;
  followingCount: number;
}

export default function FollowersPopup({
  isOpen,
  onClose,
  username,
  viewerId,
  initialTab,
  followersCount,
  followingCount,
}: FollowersPopupProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followPending, setFollowPending] = useState<Record<string, boolean>>({});

  // Reset when opened or tab changes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setSearchQuery('');
  }, [isOpen, initialTab]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const qs = viewerId ? `?viewerId=${viewerId}` : '';
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/${activeTab}${qs}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!cancelled) setRows(Array.isArray(json?.data) ? json.data : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, activeTab, username, viewerId]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed inset-x-4 top-[8%] bottom-[8%] z-50 mx-auto max-w-md rounded-2xl bg-background border border-border/50 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">@{username}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30 flex-shrink-0">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'followers'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="font-bold">{formatCount(followersCount)}</span>
            <span className="ml-1">Followers</span>
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'following'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="font-bold">{formatCount(followingCount)}</span>
            <span className="ml-1">Following</span>
          </button>
        </div>

        {/* Search */}
        {!loading && rows.length > 3 && (
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-accent/20 border border-border/30 rounded-xl outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground/70 mb-1">
                {searchQuery.trim() ? 'No one found' : activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </p>
              {searchQuery.trim() && (
                <p className="text-xs text-muted-foreground/60">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="py-1">
              {list.map((u) => {
                const isOwnProfile = viewerId === u.id;
                const initial = (u.full_name || u.username).charAt(0).toUpperCase();
                const typeLabel = u.user_type ? USER_TYPE_LABELS[u.user_type] : null;
                const avatarSrc = u.avatar_url ? toProxyUrl(u.avatar_url, { width: 44, quality: 80 }) : null;

                return (
                  <Link
                    key={u.id}
                    href={`/profile/${encodeURIComponent(u.username)}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-border/20">
                        {avatarSrc ? (
                          <Image
                            src={avatarSrc}
                            alt="" width={44} height={44}
                            className="w-full h-full object-cover" loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{initial}</span>
                          </div>
                        )}
                      </div>
                      {u.is_verified && (
                        <Image
                          src="/icons/verify_badge.svg" alt="Verified"
                          width={14} height={14}
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5"
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
                      <div className="flex items-center gap-2.5 mt-0.5">
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
                        className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all flex-shrink-0 ${
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
      </div>
    </>
  );
}
