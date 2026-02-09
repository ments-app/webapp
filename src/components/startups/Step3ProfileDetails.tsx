"use client";

import { useState, useRef } from 'react';
import { FileText, X, Upload } from 'lucide-react';

type Step3Props = {
  data: {
    description: string;
    keywords: string[];
    website: string;
    founded_date: string;
    registered_address: string;
    startup_email: string;
    startup_phone: string;
    pitch_deck_url: string;
  };
  onChange: (field: string, value: string | string[]) => void;
  onPitchDeckUpload: (file: File) => void;
  isUploadingDeck: boolean;
};

export function Step3ProfileDetails({ data, onChange, onPitchDeckUpload, isUploadingDeck }: Step3Props) {
  const [keywordInput, setKeywordInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile Details</h2>
        <p className="text-sm text-muted-foreground">Tell the world about your startup</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="What does your startup do? What problem does it solve?"
          rows={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Keywords / Sectors</label>
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

      {/* Founded Date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Founded Date</label>
        <input
          type="date"
          value={data.founded_date}
          onChange={(e) => onChange('founded_date', e.target.value)}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Registered Address</label>
        <input
          type="text"
          value={data.registered_address}
          onChange={(e) => onChange('registered_address', e.target.value)}
          placeholder="City, State, Country"
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.startup_email}
            onChange={(e) => onChange('startup_email', e.target.value)}
            placeholder="hello@startup.com"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.startup_phone}
            onChange={(e) => onChange('startup_phone', e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Pitch Deck */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Pitch Deck (PDF)</label>
        {data.pitch_deck_url ? (
          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border/50">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">Pitch deck uploaded</span>
            <button
              type="button"
              onClick={() => onChange('pitch_deck_url', '')}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingDeck}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isUploadingDeck ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload PDF
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPitchDeckUpload(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}
