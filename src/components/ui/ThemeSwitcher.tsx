"use client";

import { useTheme } from '@/context/theme/ThemeContext';
import { Button } from './Button';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useState } from 'react';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: React.ReactNode;
};

type ColorOption = {
  value: 'emerald' | 'violet' | 'blue' | 'amber';
  label: string;
  bgClass: string;
};

export function ThemeSwitcher() {
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: ThemeOption[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" /> },
    { value: 'system', label: 'System', icon: <Laptop className="h-5 w-5" /> },
  ];

  const colorOptions: ColorOption[] = [
    { value: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-500' },
    { value: 'violet', label: 'Violet', bgClass: 'bg-violet-500' },
    { value: 'blue', label: 'Blue', bgClass: 'bg-blue-500' },
    { value: 'amber', label: 'Amber', bgClass: 'bg-amber-500' },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start"
      >
        <span>Appearance</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card p-4 shadow-md z-50">
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(option.value)}
                  className="justify-start gap-2"
                >
                  {option.icon}
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Color</h3>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColorScheme(option.value)}
                  className={`h-8 w-8 rounded-full ${option.bgClass} flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
                  title={option.label}
                >
                  {colorScheme === option.value && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
