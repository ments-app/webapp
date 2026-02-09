"use client";

import { Lightbulb, Cpu, TrendingUp, Globe, Award } from 'lucide-react';

type Step2Props = {
  data: { stage: string };
  onChange: (field: string, value: string) => void;
};

const stages = [
  { value: 'ideation', label: 'Ideation', desc: 'Validating the idea and market', icon: Lightbulb, color: 'from-blue-500 to-cyan-500' },
  { value: 'mvp', label: 'MVP', desc: 'Building and testing the first version', icon: Cpu, color: 'from-purple-500 to-pink-500' },
  { value: 'scaling', label: 'Scaling', desc: 'Growing users and revenue', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  { value: 'expansion', label: 'Expansion', desc: 'Entering new markets or verticals', icon: Globe, color: 'from-orange-500 to-amber-500' },
  { value: 'maturity', label: 'Maturity', desc: 'Established and profitable', icon: Award, color: 'from-red-500 to-rose-500' },
];

export function Step2CurrentStage({ data, onChange }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Current Stage</h2>
        <p className="text-sm text-muted-foreground">Where is your startup right now?</p>
      </div>

      <div className="grid gap-3">
        {stages.map((s) => {
          const Icon = s.icon;
          const isSelected = data.stage === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange('stage', s.value)}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-md flex-shrink-0`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              {isSelected && (
                <div className="ml-auto">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
