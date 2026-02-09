"use client";

import { Rocket, Globe, Mail, Phone, FileText, TrendingUp, Users, Award, Building } from 'lucide-react';

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

type PreviewProps = {
  data: {
    brand_name: string; registered_name: string; legal_status: string; cin: string;
    stage: string; description: string; keywords: string[]; website: string;
    founded_date: string; registered_address: string; startup_email: string;
    startup_phone: string; pitch_deck_url: string; is_actively_raising: boolean;
  };
  founders: { name: string; linkedin_url: string; display_order: number }[];
  fundingRounds: { investor: string; amount: string; round_type: string; round_date: string; is_public: boolean }[];
  incubators: { program_name: string; year: number | '' }[];
  awards: { award_name: string; year: number | '' }[];
};

export function StartupPreview({ data, founders, fundingRounds, incubators, awards }: PreviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preview</h2>
        <p className="text-sm text-muted-foreground">This is how your startup will appear to others</p>
      </div>

      <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stageColors[data.stage] || 'from-primary to-primary/80'} shadow-lg`}>
              <Rocket className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{data.brand_name || 'Your Startup'}</h1>
              {data.registered_name && <p className="text-sm text-muted-foreground">{data.registered_name}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${stageColors[data.stage] || 'from-primary to-primary/80'} text-white`}>
                  {stageLabels[data.stage] || 'Stage'}
                </span>
                <span className="text-xs text-muted-foreground">{legalLabels[data.legal_status] || ''}</span>
              </div>
            </div>
          </div>
          {data.is_actively_raising && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20">
              <TrendingUp className="h-3.5 w-3.5" /> Raising
            </span>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">About</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.description}</p>
          </div>
        )}

        {/* Keywords */}
        {data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.keywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-accent/60 text-accent-foreground">{kw}</span>
            ))}
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{data.website}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" /> {data.startup_email || '—'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" /> {data.startup_phone || '—'}
          </div>
          {data.pitch_deck_url && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <FileText className="h-4 w-4 flex-shrink-0" /> Pitch Deck Available
            </div>
          )}
        </div>

        {/* Founders */}
        {founders.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Users className="h-4 w-4" /> Team
            </h3>
            <div className="space-y-2">
              {founders.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {f.name.charAt(0)}
                  </div>
                  <span className="text-foreground">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Funding */}
        {fundingRounds.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <TrendingUp className="h-4 w-4" /> Funding
            </h3>
            <div className="space-y-2">
              {fundingRounds.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-accent/20 rounded-lg">
                  <span className="text-foreground">{roundLabels[r.round_type] || r.round_type || 'Round'}</span>
                  <span className="text-muted-foreground">{r.amount || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incubators */}
        {incubators.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Building className="h-4 w-4" /> Incubators
            </h3>
            <div className="flex flex-wrap gap-2">
              {incubators.map((inc, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs bg-accent/60 text-accent-foreground">
                  {inc.program_name} {inc.year ? `(${inc.year})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Award className="h-4 w-4" /> Awards
            </h3>
            <div className="flex flex-wrap gap-2">
              {awards.map((a, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {a.award_name} {a.year ? `(${a.year})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
