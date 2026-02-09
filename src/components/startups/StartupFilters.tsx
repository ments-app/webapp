"use client";

import { TrendingUp } from 'lucide-react';

type StartupFiltersProps = {
  stage: string;
  raising: boolean;
  onStageChange: (stage: string) => void;
  onRaisingChange: (raising: boolean) => void;
};

const stages = [
  { value: '', label: 'All Stages' },
  { value: 'ideation', label: 'Ideation' },
  { value: 'mvp', label: 'MVP' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'maturity', label: 'Maturity' },
];

export function StartupFilters({ stage, raising, onStageChange, onRaisingChange }: StartupFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Stage pills */}
      {stages.map((s) => (
        <button
          key={s.value}
          onClick={() => onStageChange(s.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            stage === s.value
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
          }`}
        >
          {s.label}
        </button>
      ))}

      {/* Raising filter */}
      <button
        onClick={() => onRaisingChange(!raising)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          raising
            ? 'bg-green-500/15 text-green-600 border border-green-500/30'
            : 'bg-muted text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
        }`}
      >
        <TrendingUp className="h-3 w-3" />
        Raising
      </button>
    </div>
  );
}
