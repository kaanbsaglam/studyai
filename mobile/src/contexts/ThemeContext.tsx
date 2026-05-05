import React, { createContext, useContext } from 'react';

const tokens = {
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
} as const;

export type ThemeTokens = typeof tokens;

interface ThemeContextValue {
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue>({ tokens });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
