"use client";

import { Plus, X, GripVertical } from 'lucide-react';

type Founder = {
  name: string;
  linkedin_url: string;
  display_order: number;
};

type Step4Props = {
  founders: Founder[];
  onChange: (founders: Founder[]) => void;
};

export function Step4Team({ founders, onChange }: Step4Props) {
  const addFounder = () => {
    onChange([...founders, { name: '', linkedin_url: '', display_order: founders.length }]);
  };

  const removeFounder = (index: number) => {
    onChange(founders.filter((_, i) => i !== index).map((f, i) => ({ ...f, display_order: i })));
  };

  const updateFounder = (index: number, field: keyof Founder, value: string) => {
    const updated = [...founders];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const moveFounder = (from: number, to: number) => {
    if (to < 0 || to >= founders.length) return;
    const updated = [...founders];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated.map((f, i) => ({ ...f, display_order: i })));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Team / Founders</h2>
        <p className="text-sm text-muted-foreground">Add your founding team members</p>
      </div>

      <div className="space-y-3">
        {founders.map((founder, index) => (
          <div key={index} className="flex items-start gap-2 p-4 bg-accent/20 border border-border/50 rounded-xl">
            <div className="flex flex-col gap-1 pt-2">
              <button
                type="button"
                onClick={() => moveFounder(index, index - 1)}
                disabled={index === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={founder.name}
                onChange={(e) => updateFounder(index, 'name', e.target.value)}
                placeholder="Founder name"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="url"
                value={founder.linkedin_url}
                onChange={(e) => updateFounder(index, 'linkedin_url', e.target.value)}
                placeholder="LinkedIn URL (optional)"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={() => removeFounder(index)}
              className="mt-2 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addFounder}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Founder
      </button>
    </div>
  );
}
