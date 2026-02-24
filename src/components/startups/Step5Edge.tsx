"use client";

import { Zap, Target } from 'lucide-react';

type Step5Props = {
  data: {
    key_strengths: string;
    target_audience: string;
  };
  onChange: (field: string, value: string) => void;
};

const textareaClass = "w-full px-4 py-3 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors resize-none";

export function Step5Edge({ data, onChange }: Step5Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Competitive Edge</h2>
        <p className="text-sm text-muted-foreground mt-1">What sets you apart from the rest?</p>
      </div>

      {/* Key Strengths */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          Key Strengths / USP
        </label>
        <textarea
          value={data.key_strengths}
          onChange={(e) => onChange('key_strengths', e.target.value)}
          placeholder="What are your unique advantages? e.g. proprietary technology, first-mover advantage, strong network, domain expertise..."
          rows={5}
          className={textareaClass}
        />
      </div>

      {/* Target Audience */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
            <Target className="h-3.5 w-3.5 text-blue-500" />
          </div>
          Target Audience
        </label>
        <textarea
          value={data.target_audience}
          onChange={(e) => onChange('target_audience', e.target.value)}
          placeholder="Who are your primary customers or users? e.g. B2B SaaS companies with 50-500 employees, college students in tier-1 cities..."
          rows={5}
          className={textareaClass}
        />
      </div>
    </div>
  );
}
