"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/utils/supabase';
import { toProxyUrl } from '@/utils/imageUtils';
import Image from 'next/image';
import Link from 'next/link';
import { Rocket, Plus, ChevronUp, Bookmark, MapPin, Zap, Loader2, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type StartupItem = {
  id: string;
  brand_name: string;
  description: string | null;
  elevator_pitch: string | null;
  stage: string;
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

const STAGE_COLORS: Record<string, { pill: string; hex: string }> = {
  ideation:  { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/25',      hex: '#4A9EFF' },
  mvp:       { pill: 'bg-purple-500/10 text-purple-400 border-purple-500/25',  hex: '#AB70FF' },
  scaling:   { pill: 'bg-orange-500/10 text-orange-400 border-orange-500/25',  hex: '#FF9500' },
  expansion: { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', hex: '#34D399' },
  maturity:  { pill: 'bg-teal-500/10 text-teal-400 border-teal-500/25',        hex: '#20CFCF' },
};

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#F5A623', '#C0C0C0', '#CD7F32'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function stageHex(stage: string): string {
  return STAGE_COLORS[stage]?.hex ?? '#34D399';
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
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
  const [sortMode, setSortMode] = useState<'hot' | 'new'>('hot');
  const [showBookmarks, setShowBookmarks] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('startup_profiles')
        .select('id, brand_name, description, elevator_pitch, stage, is_actively_raising, logo_url, banner_url, city, country, created_at')
        .eq('is_published', true);

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
  }, [filterStage, sortMode, user?.id]);

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

  const showPodium = sortMode === 'hot' && startups.length >= 3;
  const top3 = showPodium ? startups.slice(0, 3) : [];
  const ranked = showPodium ? startups.slice(3) : startups;

  return (
    <DashboardLayout>
      <div>
        {/* ── Header ── */}
        <div className="flex items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">Startups</h1>
            {!loading && (
              <p className="text-xs text-muted-foreground">{startups.length} listed · ranked by votes</p>
            )}
          </div>
          <Link
            href="/startups/create"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>List</span>
          </Link>
          <button
            onClick={() => setShowBookmarks(true)}
            className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        {/* ── Sort + Filter Controls ── */}
        <Controls
          sortMode={sortMode}
          setSortMode={setSortMode}
          filterStage={filterStage}
          setFilterStage={setFilterStage}
        />

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-7 w-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading startups...</p>
          </div>
        ) : startups.length === 0 ? (
          <EmptyState
            title={filterStage ? `No ${STAGE_LABELS[filterStage] ?? filterStage} startups yet` : 'No startups listed yet'}
            subtitle={filterStage ? 'Try a different stage filter' : 'Be the first to list your startup'}
          />
        ) : (
          <>
            {/* Podium */}
            {showPodium && (
              <Podium top3={top3} upvotedIds={upvotedIds} votingIds={votingIds} onVote={toggleVote} />
            )}

            {/* Rankings header */}
            <div className="flex items-center gap-2 py-3">
              <span className="text-sm">{sortMode === 'hot' ? '📊' : '🕐'}</span>
              <span className="text-sm font-semibold text-foreground">
                {sortMode === 'hot' ? 'All Rankings' : 'Latest'}
              </span>
              <div className="ml-auto px-2 py-0.5 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">{startups.length} total</span>
              </div>
            </div>

            {/* Ranked list */}
            <div className="space-y-2">
              {ranked.map((s, i) => (
                <RankedCard
                  key={s.id}
                  startup={s}
                  rank={showPodium ? i + 4 : i + 1}
                  upvoted={upvotedIds.has(s.id)}
                  loading={votingIds.has(s.id)}
                  onVote={toggleVote}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bookmarks sheet */}
      {showBookmarks && user && (
        <BookmarksSheet userId={user.id} onClose={() => setShowBookmarks(false)} />
      )}
    </DashboardLayout>
  );
}

// ── Controls ──────────────────────────────────────────────────────────────────

function Controls({
  sortMode, setSortMode, filterStage, setFilterStage,
}: {
  sortMode: 'hot' | 'new';
  setSortMode: (m: 'hot' | 'new') => void;
  filterStage: string | null;
  setFilterStage: (s: string | null) => void;
}) {
  return (
    <div className="space-y-2 pb-3">
      {/* Sort pills */}
      <div className="flex items-center gap-2">
        <SortPill emoji="🔥" label="Hot" active={sortMode === 'hot'} onClick={() => setSortMode('hot')} />
        <SortPill emoji="✨" label="New" active={sortMode === 'new'} onClick={() => setSortMode('new')} />
        {filterStage && (
          <button
            onClick={() => setFilterStage(null)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium"
          >
            {STAGE_LABELS[filterStage] ?? filterStage}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {/* Stage chips — horizontally scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <StageChip label="All" active={filterStage === null} onClick={() => setFilterStage(null)} />
        {STAGES.map(s => (
          <StageChip key={s} label={STAGE_LABELS[s]!} active={filterStage === s} onClick={() => setFilterStage(s)} />
        ))}
      </div>
    </div>
  );
}

function SortPill({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-all ${
        active
          ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400 font-semibold shadow-sm'
          : 'bg-card border-border text-muted-foreground hover:text-foreground font-medium'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function StageChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-lg text-xs border transition-all ${
        active
          ? 'bg-emerald-500/10 border-emerald-500/45 text-emerald-400 font-semibold'
          : 'bg-transparent border-border text-muted-foreground hover:text-foreground font-normal'
      }`}
    >
      {label}
    </button>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

function Podium({ top3, upvotedIds, votingIds, onVote }: {
  top3: StartupItem[];
  upvotedIds: Set<string>;
  votingIds: Set<string>;
  onVote: (id: string) => void;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <span className="text-xs">🏆</span>
          <span className="text-xs font-semibold text-yellow-500">Community Top 3</span>
        </div>
        <span className="text-xs text-muted-foreground pr-1">Scroll →</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {top3.map((s, i) => (
          <PodiumCard
            key={s.id}
            startup={s}
            rank={i + 1}
            upvoted={upvotedIds.has(s.id)}
            loading={votingIds.has(s.id)}
            onVote={onVote}
          />
        ))}
      </div>
      <div className="mt-3 border-b border-border" />
    </div>
  );
}

function PodiumCard({ startup, rank, upvoted, loading, onVote }: {
  startup: StartupItem;
  rank: number;
  upvoted: boolean;
  loading: boolean;
  onVote: (id: string) => void;
}) {
  const hex = stageHex(startup.stage);
  const bannerSrc = resolveImageUrl(startup.banner_url);
  const logoSrc = resolveImageUrl(startup.logo_url);
  const medal = MEDALS[rank - 1] ?? '';
  const medalColor = MEDAL_COLORS[rank - 1] ?? '#888';
  const pitch = startup.elevator_pitch || startup.description || '';
  const inits = getInitials(startup.brand_name);
  const stageStyle = STAGE_COLORS[startup.stage];

  return (
    <Link href={`/startups/${startup.id}`} className="shrink-0 block" style={{ width: 192 }}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative overflow-hidden" style={{ height: 96 }}>
          {bannerSrc ? (
            <Image src={bannerSrc} alt={startup.brand_name} fill className="object-cover" unoptimized />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${hex}50 0%, ${hex}14 60%, rgba(0,0,0,0.5) 100%)` }}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/75" />
          {/* Medal */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 border"
            style={{ borderColor: `${medalColor}88` }}
          >
            <span className="text-[10px]">{medal}</span>
            <span className="text-[10px] font-extrabold" style={{ color: medalColor }}>#{rank}</span>
          </div>
          {/* Name */}
          <p className="absolute bottom-2 left-2.5 right-2.5 text-[13px] font-bold text-white leading-tight truncate drop-shadow">
            {startup.brand_name}
          </p>
        </div>

        {/* Body */}
        <div className="p-2.5 space-y-2">
          {/* Logo + tags */}
          <div className="flex items-center gap-2">
            <LogoWidget logoSrc={logoSrc} inits={inits} hex={hex} size={30} />
            <div className="flex flex-wrap gap-1">
              {stageStyle && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${stageStyle.pill}`}>
                  {STAGE_LABELS[startup.stage] ?? startup.stage}
                </span>
              )}
              {startup.is_actively_raising && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/25">
                  <Zap className="h-2.5 w-2.5" />
                  Raising
                </span>
              )}
            </div>
          </div>

          {/* Pitch */}
          {pitch && (
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{pitch}</p>
          )}

          {/* Upvote button */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onVote(startup.id); }}
            className={`w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold border transition-all ${
              upvoted
                ? 'bg-emerald-500/10 border-emerald-500/45 text-emerald-400'
                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {upvoted ? `Upvoted · ${startup._votes}` : `Upvote · ${startup._votes}`}
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}

// ── Ranked Card ───────────────────────────────────────────────────────────────

function RankedCard({ startup, rank, upvoted, loading, onVote }: {
  startup: StartupItem;
  rank: number;
  upvoted: boolean;
  loading: boolean;
  onVote: (id: string) => void;
}) {
  const hex = stageHex(startup.stage);
  const logoSrc = resolveImageUrl(startup.logo_url);
  const inits = getInitials(startup.brand_name);
  const stageStyle = STAGE_COLORS[startup.stage];
  const pitch = startup.elevator_pitch || startup.description || '';
  const location = [startup.city, startup.country].filter(Boolean).join(', ');
  const rankColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : undefined;

  return (
    <Link href={`/startups/${startup.id}`} className="block">
      <div className="bg-card border border-border rounded-2xl p-3 flex items-start gap-2 hover:shadow-sm transition-all">
        {/* Rank */}
        <div className="w-6 shrink-0 pt-1 text-center">
          <span
            className="text-[13px] font-bold"
            style={{ color: rankColor ?? 'var(--muted-foreground)' }}
          >
            {rank}
          </span>
        </div>

        {/* Logo */}
        <LogoWidget logoSrc={logoSrc} inits={inits} hex={hex} size={48} />

        {/* Info */}
        <div className="flex-1 min-w-0 ml-1">
          <p className="text-sm font-semibold text-foreground truncate">{startup.brand_name}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {stageStyle && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${stageStyle.pill}`}>
                {STAGE_LABELS[startup.stage] ?? startup.stage}
              </span>
            )}
            {startup.is_actively_raising && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/25">
                <Zap className="h-2.5 w-2.5" />
                Raising
              </span>
            )}
          </div>
          {pitch && (
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-1.5">{pitch}</p>
          )}
          {location && (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Upvote pill */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onVote(startup.id); }}
          className={`shrink-0 py-2.5 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all ${
            upvoted
              ? 'bg-emerald-500/10 border-emerald-500/45'
              : 'bg-muted/40 border-border hover:border-muted-foreground/30'
          }`}
          style={{ width: 44 }}
        >
          {loading ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              style={{ color: upvoted ? '#34D399' : 'var(--muted-foreground)' }}
            />
          ) : (
            <>
              <ChevronUp className="h-4 w-4" style={{ color: upvoted ? '#34D399' : 'var(--muted-foreground)' }} />
              <span
                className="text-[11px] font-bold leading-none"
                style={{ color: upvoted ? '#34D399' : 'var(--muted-foreground)' }}
              >
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

function LogoWidget({ logoSrc, inits, hex, size }: { logoSrc: string | null; inits: string; hex: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.26);

  if (logoSrc && !failed) {
    return (
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: size, height: size, borderRadius: radius,
          border: `1.5px solid ${hex}4D`,
          background: `${hex}14`,
        }}
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
      className="shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size, borderRadius: radius,
        border: `1.5px solid ${hex}4D`,
        background: `linear-gradient(135deg, ${hex}2E 0%, ${hex}0D 100%)`,
      }}
    >
      <span className="font-bold leading-none" style={{ fontSize: size * 0.32, color: hex }}>{inits}</span>
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
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border shrink-0">
          <Bookmark className="h-4 w-4 text-emerald-400" />
          <span className="text-base font-bold text-foreground">Upvoted Startups</span>
          {!loading && (
            <div className="ml-auto px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-xs font-semibold text-emerald-400">{bookmarked.length}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookmarked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Bookmark className="h-11 w-11 text-muted-foreground/40" />
              <p className="text-base text-foreground">No upvoted startups yet</p>
              <p className="text-sm text-muted-foreground">Upvote startups you find interesting</p>
            </div>
          ) : (
            <div className="p-4 space-y-2 pb-10">
              {bookmarked.map(s => {
                const stageStyle = STAGE_COLORS[s.stage];
                const kw = Array.isArray(s.keywords) && s.keywords.length > 0 ? s.keywords[0] : null;
                return (
                  <Link key={s.id} href={`/startups/${s.id}`} onClick={onClose} className="block">
                    <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-3.5 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.brand_name}</p>
                        {stageStyle && (
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${stageStyle.pill}`}>
                            {STAGE_LABELS[s.stage] ?? s.stage}
                          </span>
                        )}
                        {kw && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{kw}</p>}
                      </div>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); removeBookmark(s.id); }}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
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
    <div className="flex flex-col items-center justify-center py-20 gap-3.5">
      <div className="h-[72px] w-[72px] rounded-full bg-card border border-border flex items-center justify-center">
        <Rocket className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
