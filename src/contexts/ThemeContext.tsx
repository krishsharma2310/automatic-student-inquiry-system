/**
 * ThemeContext
 * -------------
 * Centralized light/dark theme management.
 * Responsibilities:
 * - Persist user preference in localStorage
 * - Respect system color scheme on first load
 * - Sync Tailwind `dark` class with current theme
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

/**
 * Allowed theme values
 */
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Context instance (undefined by default to enforce provider usage)
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /**
   * Initialize theme:
   * 1. Load from localStorage if present
   * 2. Fallback to system preference
   */
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  /**
   * Sync DOM and persistence whenever theme changes
   */
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Toggle between light and dark modes
   */
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Safe hook accessor with provider enforcement
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};