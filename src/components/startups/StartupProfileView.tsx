"use client";

import { StartupProfile } from '@/api/startups';
import { Rocket, Globe, Mail, Phone, FileText, TrendingUp, Users, Award, Building, Bookmark, BookmarkCheck, ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';

const stageLabels: Record<string, string> = {
  ideation: 'Ideation', mvp: 'MVP', scaling: 'Scaling', expansion: 'Expansion', maturity: 'Maturity',
};
const stageColors: Record<string, string> = {
  ideation: 'from-blue-500 to-cyan-500', mvp: 'from-purple-500 to-pink-500', scaling: 'from-green-500 to-emerald-500',
  expansion: 'from-orange-500 to-amber-500', maturity: 'from-red-500 to-rose-500',
};
const legalLabels: Record<string, string> = {
  llp: 'LLP', pvt_ltd: 'Pvt Ltd', sole_proprietorship: 'Sole Proprietorship', not_registered: 'Not Registered',
};
const roundLabels: Record<string, string> = {
  pre_seed: 'Pre-Seed', seed: 'Seed', series_a: 'Series A', series_b: 'Series B', series_c: 'Series C', other: 'Other',
};

type Props = {
  startup: StartupProfile;
  isOwner?: boolean;
  onBookmark?: () => void;
  onUnbookmark?: () => void;
};

export function StartupProfileView({ startup, isOwner, onBookmark, onUnbookmark }: Props) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${stageColors[startup.stage] || 'from-primary to-primary/80'} shadow-lg`}>
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{startup.brand_name}</h1>
              {startup.registered_name && <p className="text-sm text-muted-foreground">{startup.registered_name}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${stageColors[startup.stage] || 'from-primary to-primary/80'} text-white`}>
                  {stageLabels[startup.stage] || startup.stage}
                </span>
                <span className="text-xs text-muted-foreground">{legalLabels[startup.legal_status] || ''}</span>
                {startup.cin && <span className="text-xs text-muted-foreground">CIN: {startup.cin}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {startup.is_actively_raising && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20 animate-pulse">
                <TrendingUp className="h-3.5 w-3.5" /> Raising
              </span>
            )}
            {isOwner ? (
              <Link
                href={`/startups/${startup.id}/edit`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Edit Profile
              </Link>
            ) : (
              <button
                onClick={startup.is_bookmarked ? onUnbookmark : onBookmark}
                className="p-2 rounded-xl border border-border hover:bg-accent/50 transition-colors"
              >
                {startup.is_bookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* View count for owner */}
        {isOwner && startup.view_count !== undefined && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> {startup.view_count} profile view{startup.view_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* About */}
      {startup.description && (
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{startup.description}</p>
        </div>
      )}

      {/* Keywords */}
      {startup.keywords && startup.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {startup.keywords.map((kw, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs bg-accent/60 text-accent-foreground font-medium">{kw}</span>
          ))}
        </div>
      )}

      {/* Contact & Links */}
      <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3">Contact & Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" /> {startup.startup_email}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" /> {startup.startup_phone}
          </div>
          {startup.website && (
            <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Globe className="h-4 w-4 flex-shrink-0" /> {startup.website} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {startup.pitch_deck_url && (
            <a href={startup.pitch_deck_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4 flex-shrink-0" /> View Pitch Deck <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {startup.founded_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Founded: {new Date(startup.founded_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </div>
          )}
          {startup.registered_address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {startup.registered_address}
            </div>
          )}
        </div>
      </div>

      {/* Founders */}
      {startup.founders && startup.founders.length > 0 && (
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Users className="h-4 w-4" /> Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {startup.founders.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {f.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  {f.linkedin_url && (
                    <a href={f.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funding Rounds */}
      {startup.funding_rounds && startup.funding_rounds.length > 0 && (
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <TrendingUp className="h-4 w-4" /> Funding
          </h3>
          <div className="space-y-2">
            {startup.funding_rounds.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-accent/20 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{roundLabels[r.round_type || ''] || r.round_type || 'Round'}</p>
                  {r.investor && <p className="text-xs text-muted-foreground">{r.investor}</p>}
                </div>
                <div className="text-right">
                  {r.amount && <p className="text-sm font-semibold text-foreground">{r.amount}</p>}
                  {r.round_date && <p className="text-xs text-muted-foreground">{new Date(r.round_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incubators */}
      {startup.incubators && startup.incubators.length > 0 && (
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Building className="h-4 w-4" /> Incubators
          </h3>
          <div className="flex flex-wrap gap-2">
            {startup.incubators.map((inc) => (
              <span key={inc.id} className="px-3 py-1.5 rounded-full text-xs bg-accent/60 text-accent-foreground font-medium">
                {inc.program_name} {inc.year ? `(${typeof inc.year === 'string' ? new Date(inc.year).getFullYear() : inc.year})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {startup.awards && startup.awards.length > 0 && (
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Award className="h-4 w-4" /> Awards
          </h3>
          <div className="flex flex-wrap gap-2">
            {startup.awards.map((a) => (
              <span key={a.id} className="px-3 py-1.5 rounded-full text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                {a.award_name} {a.year ? `(${typeof a.year === 'string' ? new Date(a.year).getFullYear() : a.year})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
