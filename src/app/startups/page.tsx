"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/utils/supabase';
import { toProxyUrl } from '@/utils/imageUtils';
import Image from 'next/image';
import Link from 'next/link';
import { Rocket, Plus, ChevronUp, ChevronDown, Bookmark, MapPin, X, TrendingUp, Eye, Edit, ExternalLink, FolderKanban, BarChart3, Clock, Flame, Sparkles } from 'lucide-react';
import { fetchMyVentures, updateStartup, StartupProfile } from '@/api/startups';
import type { EntityType } from '@/api/startups';
import { DealFlowTab } from '@/components/investor/DealFlowTab';
import { InvestorVerifyModal } from '@/components/investor/InvestorVerifyModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type StartupItem = {
  id: string;
  brand_name: string;
  description: string | null;
  elevator_pitch: string | null;
  stage: string;
  entity_type: EntityType;
  is_actively_raising: boolean;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  _votes: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = ['ideation', 'mvp', 'scaling', 'expansion', 'maturity'] as const;

const STAGE_LABELS: Record<string, string> = {
  ideation: 'Ideation', mvp: 'MVP', scaling: 'Scaling', expansion: 'Expansion', maturity: 'Maturity',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try { return toProxyUrl(raw); } catch { return raw.startsWith('http') ? raw : null; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StartupsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-full max-w-2xl h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="w-full max-w-2xl h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="w-full max-w-2xl h-24 bg-muted animate-pulse rounded-2xl" />
        </div>
      </DashboardLayout>
    }>
      <StartupsPageContent />
    </Suspense>
  );
}

function StartupsPageContent() {
  const { user } = useAuth();
  const [startups, setStartups] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterEntityType, setFilterEntityType] = useState<EntityType | null>(null);
  const [sortMode, setSortMode] = useState<'hot' | 'new'>('hot');
  const [showBookmarks, setShowBookmarks] = useState(false);

  // ── Tab system ──
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'directory' | 'my' | 'dealflow'>('directory');
  const [myVentures, setMyVentures] = useState<StartupProfile[]>([]);
  const [investorStatus, setInvestorStatus] = useState<string>('none');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'my') setActiveTab('my');
    else if (tab === 'dealflow') setActiveTab('dealflow');
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchMeta = async () => {
      const [venturesRes, userRes] = await Promise.all([
        fetchMyVentures(user.id),
        supabase.from('users').select('investor_status').eq('id', user.id).single(),
      ]);
      setMyVentures(venturesRes.data ?? []);
      setInvestorStatus(userRes.data?.investor_status ?? 'none');
    };
    fetchMeta();
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('startup_profiles')
        .select('id, brand_name, description, elevator_pitch, stage, entity_type, is_actively_raising, logo_url, banner_url, city, country, created_at')
        .eq('is_published', true);

      if (filterEntityType) query = (query as typeof query).eq('entity_type', filterEntityType);
      if (filterStage) query = (query as typeof query).eq('stage', filterStage);

      const { data: rows } = await query.order('created_at', { ascending: false }).limit(60);
      const list: StartupItem[] = (rows || []).map((s: Omit<StartupItem, '_votes'>) => ({ ...s, _votes: 0 }));

      const ids = list.map(s => s.id);
      const userId = user?.id;

      const [allVotesRes, userVotesRes] = await Promise.all([
        ids.length > 0
          ? supabase.from('startup_bookmarks').select('startup_id').in('startup_id', ids)
          : Promise.resolve({ data: [] as { startup_id: string }[] }),
        userId
          ? supabase.from('startup_bookmarks').select('startup_id').eq('user_id', userId)
          : Promise.resolve({ data: [] as { startup_id: string }[] }),
      ]);

      const counts: Record<string, number> = {};
      for (const row of (allVotesRes.data ?? [])) {
        const sid = row.startup_id;
        if (sid) counts[sid] = (counts[sid] ?? 0) + 1;
      }

      const upvoted = new Set<string>(
        (userVotesRes.data ?? []).map((r: { startup_id: string }) => r.startup_id).filter(Boolean)
      );

      const merged = list.map(s => ({ ...s, _votes: counts[s.id] ?? 0 }));
      if (sortMode === 'hot') merged.sort((a, b) => b._votes - a._votes);

      setStartups(merged);
      setUpvotedIds(upvoted);
    } catch (e) {
      console.error('[Startups] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStage, filterEntityType, sortMode, user?.id]);

  useEffect(() => { load(); }, [load]);

  const toggleVote = useCallback(async (startupId: string) => {
    if (!user?.id) return;
    const wasUpvoted = upvotedIds.has(startupId);

    setUpvotedIds(prev => { const n = new Set(prev); if (wasUpvoted) { n.delete(startupId); } else { n.add(startupId); } return n; });
    setStartups(prev => prev.map(s => s.id === startupId ? { ...s, _votes: Math.max(0, s._votes + (wasUpvoted ? -1 : 1)) } : s));
    setVotingIds(prev => new Set(prev).add(startupId));

    try {
      if (wasUpvoted) {
        await supabase.from('startup_bookmarks').delete().eq('user_id', user.id).eq('startup_id', startupId);
      } else {
        await supabase.from('startup_bookmarks').insert({ user_id: user.id, startup_id: startupId });
      }
    } catch {
      // Revert optimistic update on error
      setUpvotedIds(prev => { const n = new Set(prev); if (wasUpvoted) { n.add(startupId); } else { n.delete(startupId); } return n; });
      setStartups(prev => prev.map(s => s.id === startupId ? { ...s, _votes: Math.max(0, s._votes + (wasUpvoted ? 1 : -1)) } : s));
    } finally {
      setVotingIds(prev => { const n = new Set(prev); n.delete(startupId); return n; });
    }
  }, [user?.id, upvotedIds]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Please sign in to view startups.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        {/* ── Header ── */}
        <div className="flex items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">Directory</h1>
            {!loading && (
              <p className="text-xs text-muted-foreground">{startups.length} listed · ranked by votes</p>
            )}
          </div>
          <Link
            href="/startups/create"
            className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>List</span>
          </Link>
          <button
            onClick={() => setShowBookmarks(true)}
            className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Bookmark className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showMyVentures={myVentures.length > 0}
          showDealFlow={investorStatus === 'verified'}
        />

        {/* ── Investor Verification CTA ── */}
        {activeTab === 'directory' && investorStatus === 'none' && (
          <div className="mb-3 p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Verify as investor</p>
              <p className="text-xs text-muted-foreground">Access deal flow and pipeline tools</p>
            </div>
            <button
              onClick={() => setShowVerifyModal(true)}
              className="shrink-0 px-4 py-2 min-h-[44px] rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              Get Verified
            </button>
          </div>
        )}

        {/* ── Directory Tab ── */}
        {activeTab === 'directory' && (
          <>
        <Controls
          sortMode={sortMode}
          setSortMode={setSortMode}
          filterStage={filterStage}
          setFilterStage={setFilterStage}
          filterEntityType={filterEntityType}
          setFilterEntityType={setFilterEntityType}
        />

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-3 flex items-start gap-3 h-24 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : startups.length === 0 ? (
          <EmptyState
            title={filterStage ? `No ${STAGE_LABELS[filterStage] ?? filterStage} startups yet` : 'No startups listed yet'}
            subtitle={filterStage ? 'Try a different stage filter' : 'Be the first to list your startup'}
          />
        ) : (
          <>
            {/* Rankings header */}
            <div className="flex items-center gap-2 py-3">
              {sortMode === 'hot' ? <BarChart3 className="h-4 w-4 text-muted-foreground" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-semibold text-foreground">
                {sortMode === 'hot' ? 'All Rankings' : 'Latest'}
              </span>
            </div>

            {/* Ranked list */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {startups.map((s, i) => (
                <RankedRow
                  key={s.id}
                  startup={s}
                  rank={i + 1}
                  upvoted={upvotedIds.has(s.id)}
                  loading={votingIds.has(s.id)}
                  onVote={toggleVote}
                  isTop3={sortMode === 'hot' && i < 3}
                />
              ))}
            </div>
          </>
        )}
          </>
        )}

        {/* ── My Ventures Tab ── */}
        {activeTab === 'my' && myVentures.length > 0 && (
          <MyVenturesTab ventures={myVentures} onUpdate={setMyVentures} />
        )}

        {/* ── Deal Flow Tab ── */}
        {activeTab === 'dealflow' && user && (
          <DealFlowTab userId={user.id} />
        )}
      </div>

      {/* Bookmarks sheet */}
      {showBookmarks && user && (
        <BookmarksSheet userId={user.id} onClose={() => setShowBookmarks(false)} />
      )}

      <InvestorVerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onSuccess={() => { setShowVerifyModal(false); setInvestorStatus('applied'); }}
      />
    </DashboardLayout>
  );
}

// ── Controls ──────────────────────────────────────────────────────────────────

function Controls({
  sortMode, setSortMode, filterStage, setFilterStage, filterEntityType, setFilterEntityType,
}: {
  sortMode: 'hot' | 'new';
  setSortMode: (m: 'hot' | 'new') => void;
  filterStage: string | null;
  setFilterStage: (s: string | null) => void;
  filterEntityType: EntityType | null;
  setFilterEntityType: (t: EntityType | null) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pb-4">
      {/* Category Segmented Control */}
      <div className="flex p-1 bg-muted rounded-xl">
        {[
          { id: null, label: 'All' },
          { id: 'startup', label: 'Startups' },
          { id: 'org_project', label: 'Projects' }
        ].map(opt => (
          <button
            key={opt.id || 'all'}
            onClick={() => setFilterEntityType(opt.id as EntityType | null)}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all min-h-[36px] ${
              filterEntityType === opt.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      
      {/* Dropdowns */}
      <div className="flex items-center gap-2 sm:ml-auto">
        {/* Stage Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={filterStage || ''}
            onChange={(e) => setFilterStage(e.target.value || null)}
            className="w-full appearance-none pl-3 pr-8 py-2 min-h-[44px] bg-card border border-border rounded-xl text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground flex items-center">
            {sortMode === 'hot' ? <Flame className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'hot' | 'new')}
            className="w-full appearance-none pl-9 pr-8 py-2 min-h-[44px] bg-card border border-border rounded-xl text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="hot">Hot</option>
            <option value="new">New</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ── Ranked Row ───────────────────────────────────────────────────────────────

function RankedRow({ startup, rank, upvoted, loading, onVote, isTop3 }: {
  startup: StartupItem;
  rank: number;
  upvoted: boolean;
  loading: boolean;
  onVote: (id: string) => void;
  isTop3?: boolean;
}) {
  const logoSrc = resolveImageUrl(startup.logo_url);
  const bannerSrc = resolveImageUrl(startup.banner_url);
  const inits = getInitials(startup.brand_name);
  const pitch = startup.elevator_pitch || startup.description || '';
  const location = [startup.city, startup.country].filter(Boolean).join(', ');

  return (
    <Link href={`/startups/${startup.id}`} className={`block hover:bg-muted/30 transition-all ${isTop3 ? 'bg-primary/5 pb-4' : 'p-4'}`}>
      {/* Expanded view for Top 3 */}
      {isTop3 && bannerSrc && (
        <div className="w-full h-24 sm:h-32 relative mb-4">
          <Image src={bannerSrc} alt={startup.brand_name} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      
      <div className={`flex items-start gap-4 ${isTop3 && bannerSrc ? 'px-4' : ''}`}>
        {/* Rank */}
        <div className={`w-6 shrink-0 text-center ${isTop3 ? (bannerSrc ? '' : 'pt-3') : 'pt-3'}`}>
          <span className={`text-sm font-bold ${isTop3 ? 'text-primary text-base' : 'text-muted-foreground'}`}>
            {rank}
          </span>
        </div>

        {/* Logo */}
        <div className={`${isTop3 && bannerSrc ? '-mt-8 relative z-10 rounded-2xl shadow-sm border-[3px] border-card' : ''}`}>
           <LogoWidget logoSrc={logoSrc} inits={inits} size={isTop3 ? 64 : 48} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className={`${isTop3 ? 'text-lg' : 'text-base'} font-semibold text-foreground truncate`}>{startup.brand_name}</p>
            <div className="flex items-center gap-1.5">
              {startup.entity_type === 'org_project' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                  Project
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                {STAGE_LABELS[startup.stage] ?? startup.stage}
              </span>
              {startup.is_actively_raising && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600">
                  Raising
                </span>
              )}
            </div>
          </div>
          {pitch && (
            <p className={`text-sm text-muted-foreground leading-snug mt-1 ${isTop3 ? 'line-clamp-2' : 'line-clamp-1'}`}>{pitch}</p>
          )}
          {location && (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Upvote pill */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onVote(startup.id); }}
          className={`shrink-0 min-w-[56px] min-h-[56px] rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
            upvoted
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {loading ? (
            <div className="h-5 w-5 bg-muted-foreground/20 rounded-full animate-pulse" />
          ) : (
            <>
              <ChevronUp className="h-5 w-5" />
              <span className="text-[11px] font-bold leading-none">
                {startup._votes}
              </span>
            </>
          )}
        </button>
      </div>
    </Link>
  );
}

// ── Logo Widget ───────────────────────────────────────────────────────────────

function LogoWidget({ logoSrc, inits, size }: { logoSrc: string | null; inits: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.26);

  if (logoSrc && !failed) {
    return (
      <div
        className="shrink-0 overflow-hidden border border-border bg-card"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={logoSrc} alt="logo" width={size} height={size}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center bg-muted border border-border"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <span className="font-bold leading-none text-muted-foreground" style={{ fontSize: size * 0.32 }}>{inits}</span>
    </div>
  );
}

// ── Bookmarks Sheet ───────────────────────────────────────────────────────────

type BookmarkedStartup = { id: string; brand_name: string; stage: string; keywords: string[] | null };

function BookmarksSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [bookmarked, setBookmarked] = useState<BookmarkedStartup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: rows } = await supabase
          .from('startup_bookmarks')
          .select('startup_id')
          .eq('user_id', userId);

        const ids = (rows ?? []).map((r: { startup_id: string }) => r.startup_id).filter(Boolean);
        if (ids.length === 0) { setBookmarked([]); setLoading(false); return; }

        const { data } = await supabase
          .from('startup_profiles')
          .select('id, brand_name, stage, keywords')
          .in('id', ids);

        setBookmarked(data ?? []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const removeBookmark = async (startupId: string) => {
    setBookmarked(prev => prev.filter(s => s.id !== startupId));
    await supabase.from('startup_bookmarks').delete()
      .eq('user_id', userId).eq('startup_id', startupId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-card border-t border-border rounded-t-3xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="p-2 bg-muted rounded-xl">
            <Bookmark className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Upvoted Startups</span>
          {!loading && (
            <div className="ml-auto px-3 py-1 rounded-lg bg-muted border border-border">
              <span className="text-sm font-semibold text-foreground">{bookmarked.length}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-4 py-3 h-20 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : bookmarked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 bg-muted rounded-full">
                <Bookmark className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">No upvoted startups yet</p>
                <p className="text-sm text-muted-foreground mt-1">Upvote startups you find interesting</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2 pb-10">
              {bookmarked.map(s => {
                const kw = Array.isArray(s.keywords) && s.keywords.length > 0 ? s.keywords[0] : null;
                return (
                  <Link key={s.id} href={`/startups/${s.id}`} onClick={onClose} className="block">
                    <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-4 py-3 hover:bg-muted/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.brand_name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-card text-muted-foreground border border-border">
                            {STAGE_LABELS[s.stage] ?? s.stage}
                          </span>
                          {kw && <span className="text-[11px] text-muted-foreground truncate">{kw}</span>}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); removeBookmark(s.id); }}
                        className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-xl transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center">
        <Rocket className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ activeTab, setActiveTab, showMyVentures, showDealFlow }: {
  activeTab: string;
  setActiveTab: (tab: 'directory' | 'my' | 'dealflow') => void;
  showMyVentures: boolean;
  showDealFlow: boolean;
}) {
  return (
    <div className="flex gap-2 pb-4 mb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <TabPill label="Directory" active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} />
      {showMyVentures && (
        <TabPill label="My Ventures" active={activeTab === 'my'} onClick={() => setActiveTab('my')} />
      )}
      {showDealFlow && (
        <TabPill label="Deal Flow" active={activeTab === 'dealflow'} onClick={() => setActiveTab('dealflow')} />
      )}
    </div>
  );
}

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary/10 border border-primary/30 text-primary'
          : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50'
      }`}
    >
      {label}
    </button>
  );
}

// ── My Ventures Tab ──────────────────────────────────────────────────────────

function MyVenturesTab({ ventures, onUpdate }: { ventures: StartupProfile[]; onUpdate: (v: StartupProfile[]) => void }) {
  const togglePublish = async (venture: StartupProfile) => {
    const { data } = await updateStartup(venture.id, { is_published: !venture.is_published });
    if (data) {
      onUpdate(ventures.map(v => v.id === data.id ? data : v));
    }
  };

  return (
    <div className="space-y-4">
      {ventures.map((startup) => {
        const isProject = startup.entity_type === 'org_project';
        return (
          <div key={startup.id} className="space-y-4 pb-4">
            {/* Venture Overview */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-muted border border-border shrink-0">
                      {isProject ? <FolderKanban className="h-6 w-6 text-foreground" /> : <Rocket className="h-6 w-6 text-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{startup.brand_name}</h2>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          {isProject ? 'Project' : STAGE_LABELS[startup.stage]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${startup.is_published ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          {startup.is_published ? 'Published' : 'Draft'}
                        </span>
                        {!isProject && startup.is_actively_raising && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                            <TrendingUp className="h-3 w-3" /> Raising
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats - Inline Row Layout */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{startup.view_count || 0}</span>
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <span className="text-sm font-semibold text-foreground">{startup.founders?.length || 0}</span>
                    <span className="text-xs text-muted-foreground">Team</span>
                  </div>
                  {!isProject && (
                    <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                      <span className="text-sm font-semibold text-foreground">{startup.funding_rounds?.length || 0}</span>
                      <span className="text-xs text-muted-foreground">Rounds</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Link
                href={`/startups/${startup.id}`}
                className="flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> View
              </Link>
              <Link
                href={`/startups/${startup.id}/edit`}
                className="flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4" /> Edit
              </Link>
              <button
                onClick={() => togglePublish(startup)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                  startup.is_published
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {startup.is_published ? 'Unpublish' : 'Publish'}
              </button>
            </div>

            {/* Separator between ventures */}
            {ventures.indexOf(startup) < ventures.length - 1 && (
              <div className="border-b border-border mt-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
