import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getItem, setItem } from '../lib/storage';
import type { Theme } from '../types';

// Token maps derived from design.md / frontend/src/index.css
const themes = {
  light: {
    pageBg: '#f5f7fb',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    inputBg: '#f8fafc',
    inputBorder: '#cbd5e1',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#8fa1b9',
    accent: '#4a6db4',
    accentSoft: 'rgba(43,108,238,0.12)',
    accentStrong: '#3c5873',
    btnBg: '#ffffff',
    btnBgPressed: '#f1f5f9',
    btnText: '#0f172a',
    btnBorder: '#cbd5e1',
    btnPrimaryBg: '#4a6db4',
    btnPrimaryText: '#ffffff',
    tabInactiveBg: '#e5e7eb',
    tabInactiveText: '#4b5563',
    separator: 'rgba(15,23,42,0.10)',
    shadowColor: '#000000',
  },
  dark: {
    pageBg: '#121212',
    cardBg: '#1E1E1E',
    cardBorder: 'transparent',
    inputBg: '#121212',
    inputBorder: '#424242',
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0',
    textMuted: '#757575',
    accent: '#7BC9FE',
    accentSoft: 'rgba(123,201,254,0.15)',
    accentStrong: '#3b82f6',
    btnBg: '#2C2C2C',
    btnBgPressed: '#383838',
    btnText: '#E0E0E0',
    btnBorder: '#444444',
    btnPrimaryBg: '#7BC9FE',
    btnPrimaryText: '#121212',
    tabInactiveBg: '#2C2C2C',
    tabInactiveText: '#B0B0B0',
    separator: 'rgba(255,255,255,0.20)',
    shadowColor: '#000000',
  },
  earth: {
    pageBg: '#f3efe6',
    cardBg: '#fbf8f1',
    cardBorder: '#d8cdbb',
    inputBg: '#f6f1e7',
    inputBorder: '#c7b8a2',
    textPrimary: '#3f2f1f',
    textSecondary: '#6f5b45',
    textMuted: '#8b775f',
    accent: '#8b5e34',
    accentSoft: 'rgba(139,94,52,0.18)',
    accentStrong: '#6f4a28',
    btnBg: '#fbf8f1',
    btnBgPressed: '#f0e8d8',
    btnText: '#3f2f1f',
    btnBorder: '#c7b8a2',
    btnPrimaryBg: '#8b5e34',
    btnPrimaryText: '#ffffff',
    tabInactiveBg: '#e8ddc6',
    tabInactiveText: '#6f5b45',
    separator: 'rgba(120,90,40,0.18)',
    shadowColor: '#58402A',
  },
} as const;

export type ThemeTokens = {
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  btnBg: string;
  btnBgPressed: string;
  btnText: string;
  btnBorder: string;
  btnPrimaryBg: string;
  btnPrimaryText: string;
  tabInactiveBg: string;
  tabInactiveText: string;
  separator: string;
  shadowColor: string;
};

interface ThemeContextValue {
  theme: Theme;
  tokens: ThemeTokens;
  setTheme: (theme: Theme) => void;
}

const THEME_KEY = 'studyai_theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    (async () => {
      const saved = await getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'earth') {
        setThemeState(saved);
      } else {
        setThemeState(systemScheme === 'dark' ? 'dark' : 'light');
      }
    })();
  }, [systemScheme]);

  const setTheme = useCallback(async (t: Theme) => {
    await setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, tokens: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
