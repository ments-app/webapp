"use client";

import { Plus, X, UserCircle, Linkedin } from 'lucide-react';

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

const inputClass = "w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors";

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

  const charCount = data.description.length;
  const charLimit = 500;
  const isNearLimit = charCount > charLimit * 0.85;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Description & Team</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us what you&apos;re building and who&apos;s behind it</p>
      </div>

      {/* Product Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Product / Service Description <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <textarea
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Describe what your startup does, the problem it solves, and what makes it unique..."
            rows={5}
            maxLength={charLimit}
            className={`${inputClass} resize-none`}
          />
          <div className="flex justify-end mt-1.5">
            <span className={`text-xs tabular-nums ${isNearLimit ? 'text-amber-500' : 'text-muted-foreground/50'}`}>
              {charCount}/{charLimit}
            </span>
          </div>
        </div>
      </div>

      {/* Founders */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Founders <span className="text-red-400">*</span>
        </label>
        <div className="space-y-3">
          {founders.map((founder, index) => (
            <div key={index} className="relative p-4 bg-accent/20 rounded-xl border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Founder {index + 1}
                </span>
                {founders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFounder(index)}
                    className="ml-auto p-1 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={founder.name}
                  onChange={(e) => updateFounder(index, 'name', e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
                <div className="relative">
                  <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <input
                    type="url"
                    value={founder.linkedin_url}
                    onChange={(e) => updateFounder(index, 'linkedin_url', e.target.value)}
                    placeholder="LinkedIn URL (optional)"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addFounder}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground bg-accent/20 hover:bg-accent/40 hover:text-foreground border border-dashed border-border/50 hover:border-border transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Co-Founder
        </button>
      </div>
    </div>
  );
}
