import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../context/ThemeContext';

const options = [
  { value: 'light', labelKey: 'themeToggle.light', icon: '☀️' },
  { value: 'dark', labelKey: 'themeToggle.dark', icon: '🌙' },
  { value: 'system', labelKey: 'themeToggle.system', icon: '💻' },
  { value: 'earth', labelKey: 'themeToggle.earth', icon: '🌿' },
];

const triggerIcons = {
  light: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  dark: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  system: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  earth: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="link-btn"
        style={{ color: 'var(--text-secondary)' }}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('themeToggle.theme')}
      >
        {t('themeToggle.theme')}
      </button>

      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-2 rounded-full border p-1 shadow-lg z-50"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
          }}
          role="menu"
        >
          <div className="flex items-center gap-1">
          {options.map((option) => {
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-full transition-colors bg-transparent border-none shadow-none focus:outline-none"
                style={
                  isActive
                    ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                    : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--input-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
