import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png' },
  { code: 'tr', label: 'Türkçe', flagUrl: 'https://flagcdn.com/w40/tr.png' },
];

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en';
  const current = languages.find((l) => l.code === currentLang);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center p-1 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-colors bg-transparent"
      >
        <img src={current.flagUrl} alt={current.label} className="w-6 h-4 rounded-sm object-cover" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white/50 border border-gray-300 rounded-md shadow-lg p-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 p-2 text-sm transition-colors bg-transparent ${
                lang.code === currentLang
                  ? 'text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              <img src={lang.flagUrl} alt={lang.label} className="w-6 h-4 rounded-sm object-cover" />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
