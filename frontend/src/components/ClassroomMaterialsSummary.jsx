import { useTranslation } from 'react-i18next';

const statItems = [
  {
    key: 'documents',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'text-blue-600',
  },
  {
    key: 'flashcardSets',
    labelKey: 'flashcards',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    color: 'text-purple-600',
  },
  {
    key: 'quizSets',
    labelKey: 'quizzes',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: 'text-green-600',
  },
  {
    key: 'summaries',
    icon: 'M4 6h16M4 12h16M4 18h7',
    color: 'text-orange-600',
  },
  {
    key: 'notes',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    color: 'text-yellow-600',
  }
];

export default function ClassroomMaterialsSummary({ counts }) {
  const { t } = useTranslation();

  if (!counts) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {statItems.map((item) => (
        <div
          key={item.key}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm font-medium ${item.color}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
          </svg>
          <span className="font-bold">{counts[item.key] ?? 0}</span>
          <span className="hidden sm:inline text-xs font-bold opacity-75">
            {t(`classroomLayout.${item.labelKey || item.key}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
