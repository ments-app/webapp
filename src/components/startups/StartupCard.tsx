"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { StartupProfile } from '@/api/startups';
import {
  Rocket, TrendingUp, Users, MapPin, Briefcase,
  Lightbulb, Crown, Gem,
} from 'lucide-react';
import { toProxyUrl } from '@/utils/imageUtils';

const stageLabels: Record<string, string> = {
  ideation: 'Ideation', mvp: 'MVP', scaling: 'Scaling', expansion: 'Expansion', maturity: 'Maturity',
};
const stageGradients: Record<string, string> = {
  ideation: 'from-blue-500 to-cyan-500',
  mvp: 'from-purple-500 to-pink-500',
  scaling: 'from-green-500 to-emerald-500',
  expansion: 'from-orange-500 to-amber-500',
  maturity: 'from-red-500 to-rose-500',
};
const stagePills: Record<string, string> = {
  ideation: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  mvp: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  scaling: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  expansion: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  maturity: 'bg-red-500/10 text-red-600 border-red-500/20',
};
const stageAccents: Record<string, string> = {
  ideation: 'via-blue-500/10',
  mvp: 'via-purple-500/10',
  scaling: 'via-emerald-500/10',
  expansion: 'via-orange-500/10',
  maturity: 'via-red-500/10',
};
const stageIcons: Record<string, typeof Rocket> = {
  ideation: Lightbulb, mvp: Rocket, scaling: TrendingUp, expansion: Crown, maturity: Gem,
};
const businessModelLabels: Record<string, string> = {
  B2B: 'B2B', B2C: 'B2C', B2B2C: 'B2B2C',
};

function StartupLogo({ startup }: { startup: StartupProfile }) {
  const [proxySrc, setProxySrc] = useState<string | null>(
    startup.logo_url ? toProxyUrl(startup.logo_url, { width: 56, quality: 85 }) : null
  );
  const [proxyFailed, setProxyFailed] = useState(false);
  const [directFailed, setDirectFailed] = useState(false);

  const StageIcon = stageIcons[startup.stage] || Rocket;

  if (proxySrc && !directFailed) {
    return (
      <Image
        src={proxySrc}
        alt={startup.brand_name}
        width={56}
        height={56}
        className="h-14 w-14 rounded-2xl object-cover"
        unoptimized
        onError={() => {
          if (!proxyFailed) {
            // Fall back to direct URL
            if (startup.logo_url && /^https?:\/\//i.test(startup.logo_url)) {
              setProxySrc(startup.logo_url);
            } else {
              setDirectFailed(true);
            }
            setProxyFailed(true);
          } else {
            setDirectFailed(true);
          }
        }}
      />
    );
  }

  // Gradient fallback
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stageGradients[startup.stage] || 'from-primary to-primary/80'} shadow-sm flex-shrink-0`}>
      <StageIcon className="h-6 w-6 text-white" />
    </div>
  );
}

function buildLocation(startup: StartupProfile): string | null {
  const parts = [startup.city, startup.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function StartupCard({ startup }: { startup: StartupProfile }) {
  const location = buildLocation(startup);
  const StageIcon = stageIcons[startup.stage] || Rocket;
  const displayText = startup.elevator_pitch || startup.description;
  const tags = [
    ...(startup.categories?.slice(0, 2) || []),
    ...(startup.keywords?.slice(0, Math.max(0, 3 - (startup.categories?.slice(0, 2).length || 0))) || []),
  ];
  const extraCount = ((startup.categories?.length || 0) + (startup.keywords?.length || 0)) - tags.length;
  const acceptedFounders = startup.founders?.filter(f => !f.status || f.status === 'accepted') || [];

  return (
    <Link href={`/startups/${startup.id}`}>
      <div className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer">

        {/* Stage accent strip */}
        <div className={`h-1 w-full bg-gradient-to-r from-transparent ${stageAccents[startup.stage] || 'via-primary/10'} to-transparent`} />

        <div className="p-4">
          {/* Header: logo + name + raising */}
          <div className="flex items-start gap-3">
            <StartupLogo startup={startup} />

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm leading-snug">
                  {startup.brand_name}
                </h3>
                {startup.is_actively_raising && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex-shrink-0 whitespace-nowrap">
                    <TrendingUp className="h-2.5 w-2.5" /> Raising
                  </span>
                )}
              </div>

              {/* Stage + business model + location */}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${stagePills[startup.stage] || 'bg-primary/10 text-primary border-primary/20'}`}>
                  <StageIcon className="h-2.5 w-2.5" />
                  {stageLabels[startup.stage] || startup.stage}
                </span>

                {startup.business_model && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Briefcase className="h-2.5 w-2.5 flex-shrink-0" />
                    {businessModelLabels[startup.business_model] || startup.business_model}
                  </span>
                )}

                {location && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[130px]">
                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {displayText && (
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 mt-3">
              {displayText}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent/60 text-foreground/70 border border-border/30">
                  {tag}
                </span>
              ))}
              {tags.slice(2).map((tag, i) => (
                <span key={`extra-${i}`} className="px-2 py-0.5 rounded-md text-[10px] bg-accent/40 text-muted-foreground">
                  {tag}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="text-[10px] text-muted-foreground">+{extraCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer: founders */}
        {acceptedFounders.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border/30 bg-accent/10 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {acceptedFounders.slice(0, 3).map((f, i) => (
                <div
                  key={f.id}
                  className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-background flex items-center justify-center text-[8px] font-bold text-primary"
                  style={{ zIndex: 3 - i }}
                  title={f.name}
                >
                  {f.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {acceptedFounders.slice(0, 2).map(f => f.name.split(' ')[0]).join(' & ')}
              {acceptedFounders.length > 2 && (
                <span className="text-muted-foreground/60"> +{acceptedFounders.length - 2} more</span>
              )}
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Users className="h-3 w-3" />
              {acceptedFounders.length}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
