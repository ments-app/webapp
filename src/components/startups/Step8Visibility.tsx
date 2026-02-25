"use client";

import { Globe, Lock, Users, Check, ShieldCheck } from 'lucide-react';

type Step8Props = {
  data: {
    visibility: string;
    confirmation: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
};

const visibilityOptions = [
  {
    value: 'public',
    label: 'Public',
    desc: 'Anyone on the platform can view your profile',
    icon: Globe,
    color: 'emerald',
  },
  {
    value: 'investors_only',
    label: 'Investors Only',
    desc: 'Only verified investors can see your full profile',
    icon: Users,
    color: 'blue',
  },
  {
    value: 'private',
    label: 'Private',
    desc: 'Only visible to you — save as draft',
    icon: Lock,
    color: 'amber',
  },
];

const colorMap: Record<string, { bg: string; icon: string; selectedBg: string }> = {
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', selectedBg: 'bg-emerald-500/15' },
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', selectedBg: 'bg-blue-500/15' },
  amber: { bg: 'bg-amber-500/10', icon: 'text-amber-500', selectedBg: 'bg-amber-500/15' },
};

export function Step8Visibility({ data, onChange }: Step8Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Visibility & Publish</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose who can see your startup profile</p>
      </div>

      {/* Visibility Selection */}
      <div className="space-y-2.5">
        {visibilityOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = data.visibility === opt.value;
          const colors = colorMap[opt.color];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('visibility', opt.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-accent/20 hover:bg-accent/35'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                isSelected ? colors.selectedBg : colors.bg
              }`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              <div className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 ${
                isSelected
                  ? 'bg-primary scale-100'
                  : 'bg-muted scale-90'
              }`}>
                {isSelected && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirmation */}
      <div className="p-4 rounded-xl bg-accent/15 border border-border/30">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={data.confirmation}
              onChange={(e) => onChange('confirmation', e.target.checked)}
              className="peer sr-only"
            />
            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              data.confirmation
                ? 'bg-primary border-primary'
                : 'bg-background border-border group-hover:border-primary/40'
            }`}>
              {data.confirmation && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
          <div className="flex-1">
            <span className="text-sm text-foreground leading-relaxed">
              I confirm that all information provided is accurate and I have the authority to create this startup profile.
            </span>
          </div>
        </label>
      </div>

      {/* Ready hint */}
      {data.confirmation && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <ShieldCheck className="h-4.5 w-4.5 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            You&apos;re all set! Click <span className="font-semibold text-foreground">Publish</span> to make your startup profile live.
          </p>
        </div>
      )}
    </div>
  );
}
