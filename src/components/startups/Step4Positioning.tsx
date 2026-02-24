"use client";

import { useState } from 'react';
import { X, Check, Plus, Hash } from 'lucide-react';

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

const inputClass = "w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors";

export function Step4Positioning({ data, onChange }: Step4Props) {
  const [keywordInput, setKeywordInput] = useState('');
  const [otherInput, setOtherInput] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(() =>
    data.categories.some(c => !PRESET_CATEGORIES.includes(c))
  );

  const customCategories = data.categories.filter(c => !PRESET_CATEGORIES.includes(c));

  const toggleCategory = (category: string) => {
    if (category === 'Other') {
      setShowOtherInput(prev => !prev);
      return;
    }
    const exists = data.categories.includes(category);
    if (exists) {
      onChange('categories', data.categories.filter(c => c !== category));
    } else {
      onChange('categories', [...data.categories, category]);
    }
  };

  const addCustomCategory = () => {
    const cat = otherInput.trim();
    if (cat && !data.categories.includes(cat)) {
      onChange('categories', [...data.categories, cat]);
      setOtherInput('');
    }
  };

  const removeCustomCategory = (cat: string) => {
    onChange('categories', data.categories.filter(c => c !== cat));
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
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Positioning</h2>
        <p className="text-sm text-muted-foreground mt-1">Define where you fit in the market</p>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2.5">Industry / Category</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => {
            const isOther = cat === 'Other';
            const isSelected = isOther
              ? (showOtherInput || customCategories.length > 0)
              : data.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/25'
                    : 'bg-accent/30 text-muted-foreground border border-transparent hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                {isSelected && !isOther && <Check className="h-3 w-3" />}
                {cat}
              </button>
            );
          })}
        </div>

        {(showOtherInput || customCategories.length > 0) && (
          <div className="mt-3 space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={otherInput}
                onChange={(e) => setOtherInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                placeholder="Type a custom category..."
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={addCustomCategory}
                disabled={!otherInput.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {customCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customCategories.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/25">
                    {cat}
                    <button type="button" onClick={() => removeCustomCategory(cat)} className="hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
        <input
          type="url"
          value={data.website}
          onChange={(e) => onChange('website', e.target.value)}
          placeholder="https://yourstartup.com"
          className={inputClass}
        />
      </div>

      {/* Team Size */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2.5">Team Size</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZES.map((ts) => {
            const selected = data.team_size === ts.value;
            return (
              <button
                key={ts.value}
                type="button"
                onClick={() => onChange('team_size', ts.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                {ts.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <Hash className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
          Keywords / Tags
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a keyword and press Enter"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={!keywordInput.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {data.keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/50 text-foreground/80 border border-border/30">
                {kw}
                <button type="button" onClick={() => removeKeyword(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
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
