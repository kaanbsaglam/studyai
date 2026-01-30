import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'theme';
const THEMES = ['light', 'dark', 'system', 'earth'];

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark');
  root.removeAttribute('data-theme');

  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (theme === 'earth') {
    root.setAttribute('data-theme', 'earth');
    return;
  }

  if (theme === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    }
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (theme !== 'system' || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');

    media.addEventListener?.('change', listener);
    media.addListener?.(listener);

    return () => {
      media.removeEventListener?.('change', listener);
      media.removeListener?.(listener);
    };
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    themes: THEMES,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
