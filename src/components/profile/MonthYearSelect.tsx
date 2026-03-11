"use client";

import { useEffect, useRef, useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: number[] = [];
for (let y = CURRENT_YEAR; y >= 1950; y--) YEARS.push(y);

interface MonthYearSelectProps {
  label: string;
  /** YYYY-MM-DD string, or empty string for unset */
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
}

export function MonthYearSelect({ label, value, onChange, disabled, error }: MonthYearSelectProps) {
  // Internal state so partial selections (month only, year only) persist
  // across re-renders without calling onChange until both are filled.
  const [localMonth, setLocalMonth] = useState(() =>
    value ? parseInt(value.slice(5, 7), 10) : 0
  );
  const [localYear, setLocalYear] = useState(() =>
    value ? parseInt(value.slice(0, 4), 10) : 0
  );

  // Sync ONLY when the external value actually changes (not on every render).
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    if (value) {
      setLocalMonth(parseInt(value.slice(5, 7), 10));
      setLocalYear(parseInt(value.slice(0, 4), 10));
    } else {
      // Explicitly cleared from outside (e.g. "I currently work here" checked)
      setLocalMonth(0);
      setLocalYear(0);
    }
  }, [value]);

  const handleMonthChange = (m: number) => {
    setLocalMonth(m);
    // Only fire onChange when BOTH are selected
    if (m && localYear) {
      onChange(`${localYear}-${String(m).padStart(2, '0')}-01`);
    }
  };

  const handleYearChange = (y: number) => {
    setLocalYear(y);
    if (localMonth && y) {
      onChange(`${y}-${String(localMonth).padStart(2, '0')}-01`);
    }
  };

  const borderClass = error
    ? 'border-red-500/50 focus:ring-red-500'
    : 'border-border focus:ring-emerald-500';

  return (
    <div>
      <span className="block text-sm text-muted-foreground mb-1.5">{label}</span>
      <div className="flex gap-2">
        <select
          className={`flex-1 px-3 py-3 rounded-xl bg-background/50 border text-foreground text-sm focus:outline-none focus:ring-2 disabled:opacity-40 ${borderClass}`}
          value={localMonth || ''}
          onChange={(e) => handleMonthChange(parseInt(e.target.value || '0', 10))}
          disabled={disabled}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className={`w-28 px-3 py-3 rounded-xl bg-background/50 border text-foreground text-sm focus:outline-none focus:ring-2 disabled:opacity-40 ${borderClass}`}
          value={localYear || ''}
          onChange={(e) => handleYearChange(parseInt(e.target.value || '0', 10))}
          disabled={disabled}
        >
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
