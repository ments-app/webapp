"use client";

import { TrendingUp } from 'lucide-react';

type Step5Props = {
  data: {
    key_strengths: string;
    target_audience: string;
  };
  onChange: (field: string, value: string) => void;
};

export function Step5Edge({ data, onChange }: Step5Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-md">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Competitive Edge</h2>
          <p className="text-sm text-muted-foreground">What sets you apart from the competition?</p>
        </div>
      </div>

      {/* Key Strengths */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Key Strengths / USP</label>
        <textarea
          value={data.key_strengths}
          onChange={(e) => onChange('key_strengths', e.target.value)}
          placeholder="What are your unique advantages? (e.g. proprietary technology, first-mover advantage, strong network, domain expertise...)"
          rows={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Target Audience</label>
        <textarea
          value={data.target_audience}
          onChange={(e) => onChange('target_audience', e.target.value)}
          placeholder="Who are your primary customers or users? (e.g. B2B SaaS companies with 50-500 employees, college students in tier-1 cities...)"
          rows={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>
    </div>
  );
}
