/**
 * ClassroomStudyStats Component
 *
 * Displays study statistics specific to a classroom,
 * including total time, mini heatmap, and per-document breakdown.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import ActivityHeatmap from './ActivityHeatmap';

export default function ClassroomStudyStats({ classroomId }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const tzOffset = new Date().getTimezoneOffset();
        const response = await api.get(`/classrooms/${classroomId}/study-stats?tzOffset=${tzOffset}`);
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to load classroom stats:', err);
        // Silently fail - stats are optional
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [classroomId]);

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      </div>
    );
  }

  const hasData = stats && stats.totalSeconds > 0;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{t('studyStats.studyTime')}</div>
      <div className="text-2xl font-bold text-gray-900">
        {formatTime(stats?.totalSeconds || 0)}
      </div>

      {/* Mini heatmap - last 4 weeks */}
      {hasData && stats.dailyData?.length > 0 && (
        <div className="mt-3">
          <ActivityHeatmap
            dailyData={stats.dailyData}
            weeks={4}
            compact
          />
        </div>
      )}

      {/* Top documents by time */}
      {hasData && stats.documents?.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500 mb-2">{t('studyStats.mostStudied')}</div>
          <div className="space-y-1">
            {stats.documents.slice(0, 3).map((doc) => (
              <div
                key={doc.id || doc.name}
                className="flex justify-between text-sm"
              >
                <span
                  className={`truncate mr-2 ${
                    doc.isDeleted ? 'text-gray-400 italic' : 'text-gray-700'
                  }`}
                >
                  {doc.name}
                </span>
                <span className="text-gray-500 flex-shrink-0">
                  {formatTime(doc.seconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <p className="text-xs text-gray-400 mt-2">
          {t('studyStats.startStudying')}
        </p>
      )}
    </div>
  );
}
