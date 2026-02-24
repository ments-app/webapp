"use client";

import { Globe, Lock, Users } from 'lucide-react';

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
  },
  {
    value: 'investors_only',
    label: 'Investors Only',
    desc: 'Only verified investors can see your full profile',
    icon: Users,
  },
  {
    value: 'private',
    label: 'Private',
    desc: 'Only visible to you — save as draft',
    icon: Lock,
  },
];

export function Step8Visibility({ data, onChange }: Step8Props) {
  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-foreground">Visibility & Publish</h2>
        <p className="text-sm text-muted-foreground">Choose who can see your startup profile</p>
      </div>

      {/* Visibility Selection */}
      <div className="space-y-3">
        {visibilityOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = data.visibility === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('visibility', opt.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
                isSelected ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirmation */}
      <div className="p-4 bg-accent/20 border border-border/50 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.confirmation}
            onChange={(e) => onChange('confirmation', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
          />
          <span className="text-sm text-foreground">
            I confirm that all information provided is accurate and I have the authority to create this startup profile.
          </span>
        </label>
      </div>
    </div>
  );
}
