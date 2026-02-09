import { useTranslation } from 'react-i18next';

export default function LanguageToggle({ className = '' }) {
  const { i18n, t } = useTranslation();

  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'tr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
      title={t('settings.languageDescription')}
    >
      <span className="text-base">{currentLang === 'en' ? '🇬🇧' : '🇹🇷'}</span>
      <span>{currentLang === 'en' ? 'EN' : 'TR'}</span>
    </button>
  );
}
