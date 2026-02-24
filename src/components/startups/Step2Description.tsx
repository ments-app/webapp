"use client";

import { Plus, X } from 'lucide-react';

type Founder = {
  name: string;
  linkedin_url: string;
  display_order: number;
};

type Step2Props = {
  data: {
    description: string;
  };
  founders: Founder[];
  onChange: (field: string, value: string) => void;
  onFoundersChange: (founders: Founder[]) => void;
};

export function Step2Description({ data, founders, onChange, onFoundersChange }: Step2Props) {
  const addFounder = () => {
    onFoundersChange([...founders, { name: '', linkedin_url: '', display_order: founders.length }]);
  };

  const removeFounder = (index: number) => {
    if (founders.length > 1) {
      onFoundersChange(
        founders.filter((_, i) => i !== index).map((f, i) => ({ ...f, display_order: i }))
      );
    }
  };

  const updateFounder = (index: number, field: keyof Founder, value: string) => {
    const updated = [...founders];
    updated[index] = { ...updated[index], [field]: value };
    onFoundersChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-foreground">Description & Team</h2>
        <p className="text-sm text-muted-foreground">Tell us about your product and founding team</p>
      </div>

      {/* Product Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Product / Service Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe what your startup does, the problem it solves, and what makes it unique..."
          rows={5}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">{data.description.length}/500 characters</p>
      </div>

      {/* Founders */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Founders <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {founders.map((founder, index) => (
            <div key={index} className="flex items-start gap-2 p-4 bg-accent/20 border border-border/50 rounded-xl">
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
              {founders.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFounder(index)}
                  className="mt-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addFounder}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Founder
        </button>
      </div>
    </div>
  );
}
