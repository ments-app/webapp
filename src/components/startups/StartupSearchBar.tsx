"use client";

import { useState } from 'react';
import { Search, X } from 'lucide-react';

type StartupSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function StartupSearchBar({ value, onChange }: StartupSearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`relative flex items-center transition-all duration-200 ${focused ? 'ring-2 ring-primary/40' : ''} rounded-xl`}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search startups..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full pl-10 pr-9 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
