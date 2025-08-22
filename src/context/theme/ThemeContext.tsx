// themecontext
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeType = 'dark' | 'light' | 'system';
type ColorSchemeType = 'emerald' | 'violet' | 'blue' | 'amber';

type ThemeContextType = {
  theme: ThemeType;
  colorScheme: ColorSchemeType;
  setTheme: (theme: ThemeType) => void;
  setColorScheme: (colorScheme: ColorSchemeType) => void;
  isDarkMode: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeType;
  defaultColorScheme?: ColorSchemeType;
};

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorScheme = 'emerald',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>(defaultTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorSchemeType>(defaultColorScheme);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as ThemeType | null;
    const storedColorScheme = localStorage.getItem('colorScheme') as ColorSchemeType | null;
    
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    
    if (storedColorScheme) {
      setColorSchemeState(storedColorScheme);
    }
  }, []);

  // Update isDarkMode based on theme and system preference
  useEffect(() => {
    const updateIsDarkMode = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(systemPrefersDark);
      } else {
        setIsDarkMode(theme === 'dark');
      }
    };

    updateIsDarkMode();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateIsDarkMode();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Update document classes when theme or color scheme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light-mode', 'dark-mode');
    root.classList.remove('theme-emerald', 'theme-violet', 'theme-blue', 'theme-amber');
    
    // Add current theme class
    root.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    
    // Add current color scheme class
    root.classList.add(`theme-${colorScheme}`);
    
    // Also set data attributes for potential CSS usage
    root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    root.setAttribute('data-color-scheme', colorScheme);
  }, [isDarkMode, colorScheme]);

  const setTheme = (newTheme: ThemeType) => {
    // Instantly update <html> class for immediate effect
    const root = document.documentElement;
    root.classList.remove('light-mode', 'dark-mode');
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-mode');
    } else {
      root.classList.add('light-mode');
    }
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setColorScheme = (newColorScheme: ColorSchemeType) => {
    setColorSchemeState(newColorScheme);
    localStorage.setItem('colorScheme', newColorScheme);
  };

  const value = {
    theme,
    colorScheme,
    setTheme,
    setColorScheme,
    isDarkMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
