"use client";

import { useState } from 'react';
import { Target, X } from 'lucide-react';

type Step4Props = {
  data: {
    categories: string[];
    website: string;
    team_size: string;
    keywords: string[];
  };
  onChange: (field: string, value: string | string[]) => void;
};

const PRESET_CATEGORIES = [
  'SaaS', 'Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'AI / ML',
  'Climate / Cleantech', 'Gaming', 'Social Media', 'Logistics',
  'Agritech', 'Proptech', 'Legaltech', 'Biotech', 'Cybersecurity',
  'Web3 / Blockchain', 'Media & Entertainment', 'HR Tech', 'Other',
];

const TEAM_SIZES = [
  { value: '1', label: 'Solo Founder' },
  { value: '2-5', label: '2-5' },
  { value: '6-20', label: '6-20' },
  { value: '21-50', label: '21-50' },
  { value: '50+', label: '50+' },
];

export function Step4Positioning({ data, onChange }: Step4Props) {
  const [keywordInput, setKeywordInput] = useState('');

  const toggleCategory = (category: string) => {
    const exists = data.categories.includes(category);
    if (exists) {
      onChange('categories', data.categories.filter(c => c !== category));
    } else {
      onChange('categories', [...data.categories, category]);
    }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !data.keywords.includes(kw)) {
      onChange('keywords', [...data.keywords, kw]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    onChange('keywords', data.keywords.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Positioning</h2>
          <p className="text-sm text-muted-foreground">Define your market and positioning</p>
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Industry / Category</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                data.categories.includes(cat)
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
        <input
          type="url"
          value={data.website}
          onChange={(e) => onChange('website', e.target.value)}
          placeholder="https://yourstartup.com"
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Team Size */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Team Size</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZES.map((ts) => (
            <button
              key={ts.value}
              type="button"
              onClick={() => onChange('team_size', ts.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                data.team_size === ts.value
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              {ts.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Keywords / Tags</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a keyword and press Enter"
            className="flex-1 px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
        {data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/60 text-accent-foreground">
                {kw}
                <button type="button" onClick={() => removeKeyword(i)} className="hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
