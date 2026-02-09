import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../context/ThemeContext';

const options = [
  { value: 'light', labelKey: 'themeToggle.light' },
  { value: 'dark', labelKey: 'themeToggle.dark' },
  { value: 'system', labelKey: 'themeToggle.system' },
  { value: 'earth', labelKey: 'themeToggle.earth' },
];

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
      className={`relative inline-flex items-center ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="theme-toggle-button inline-flex items-center rounded-full border px-3 py-1 font-semibold shadow-sm backdrop-blur"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t('themeToggle.theme')}
      </button>

      {open && (
        <div
          className="theme-toggle-menu absolute right-0 bottom-full z-50 mb-2 w-max rounded-full border p-1 text-xs shadow-sm backdrop-blur"
          role="menu"
        >
          <div className="inline-flex items-center gap-1">
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
                  className={`theme-toggle-option rounded-full px-3 py-1 font-semibold transition-colors ${
                    isActive ? 'theme-toggle-option-active' : 'bg-transparent'
                  }`}
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
