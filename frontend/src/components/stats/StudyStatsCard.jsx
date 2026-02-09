/**
 * StudyStatsCard Component
 *
 * Displays user's study time statistics: today, this week, and streak.
 */

import { useTranslation } from 'react-i18next';

export default function StudyStatsCard({ stats }) {
  const { t } = useTranslation();

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('studyStats.studyTime')}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(stats?.todaySeconds || 0)}
          </div>
          <div className="text-sm text-gray-500">{t('studyStats.today')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatTime(stats?.weekSeconds || 0)}
          </div>
          <div className="text-sm text-gray-500">{t('studyStats.thisWeek')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {stats?.streak || 0}
          </div>
          <div className="text-sm text-gray-500">
            {t('studyStats.daysStreak', { count: stats?.streak || 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}
