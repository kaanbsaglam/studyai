/**
 * ActivityHeatmap Component
 *
 * A GitHub-style activity heatmap showing daily study time.
 * Uses CSS Grid for layout - no external charting library needed.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Helper to format date as YYYY-MM-DD in local timezone (not UTC)
const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ActivityHeatmap({
  dailyData = [],
  weeks = 12,
  onDayClick,
  compact = false,
}) {
  const { t, i18n } = useTranslation();
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate grid of days (7 rows x N weeks)
  const { grid, months } = useMemo(() => {
    const days = [];
    const monthLabels = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    // End on today, aligned to Saturday (end of week)
    // Start from (weeks) full weeks before that
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay())); // Move to Saturday

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (weeks * 7) + 1);

    // Create a map for quick lookup
    const dataMap = new Map();
    for (const d of dailyData) {
      dataMap.set(d.date, d.seconds);
    }

    let lastMonth = -1;
    const totalDays = weeks * 7;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalDateStr(date);

      // Track month changes for labels
      if (date.getMonth() !== lastMonth && date.getDay() === 0) {
        monthLabels.push({
          name: date.toLocaleDateString(i18n.language, { month: 'short' }),
          week: Math.floor(i / 7),
        });
        lastMonth = date.getMonth();
      }

      days.push({
        date: dateStr,
        seconds: dataMap.get(dateStr) || 0,
        isToday: dateStr === todayStr,
        isFuture: date > today,
        dayOfWeek: date.getDay(),
      });
    }

    return { grid: days, months: monthLabels };
  }, [dailyData, weeks, i18n.language]);

  const getIntensity = (seconds) => {
    if (seconds === 0) return 'bg-gray-100';
    if (seconds < 1800) return 'bg-green-200'; // < 30 min
    if (seconds < 3600) return 'bg-green-300'; // < 1 hour
    if (seconds < 7200) return 'bg-green-400'; // < 2 hours
    return 'bg-green-600'; // 2+ hours
  };

  const formatTooltip = (day) => {
    if (day.isFuture) return day.date;
    const hours = Math.floor(day.seconds / 3600);
    const minutes = Math.floor((day.seconds % 3600) / 60);
    const timeStr = day.seconds === 0
      ? t('studyStats.noActivity')
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
    return `${day.date}: ${timeStr}`;
  };

  const cellSize = compact ? 'w-2 h-2' : 'w-3 h-3';
  const gap = compact ? 'gap-[2px]' : 'gap-1';

  return (
    <div className="relative">
      {/* Month labels */}
      {!compact && (
        <div className="flex mb-1 ml-6 text-xs text-gray-400">
          {months.map((month, i) => (
            <div
              key={i}
              style={{ marginLeft: i === 0 ? 0 : `${(month.week - (months[i - 1]?.week || 0) - 1) * 16}px` }}
            >
              {month.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex">
        {/* Day labels */}
        {!compact && (
          <div className="flex flex-col justify-around mr-1 text-xs text-gray-400">
            <span>{t('studyStats.mon')}</span>
            <span>{t('studyStats.wed')}</span>
            <span>{t('studyStats.fri')}</span>
          </div>
        )}

        {/* Heatmap grid */}
        <div
          className={`grid grid-flow-col ${gap}`}
          style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
        >
          {grid.map((day) => (
            <div
              key={day.date}
              className={`
                ${cellSize} rounded-sm transition-all cursor-pointer
                ${day.isFuture ? 'bg-gray-50' : getIntensity(day.seconds)}
                ${day.isToday ? 'ring-1 ring-blue-500 ring-offset-1' : ''}
                ${hoveredDay === day.date ? 'ring-1 ring-gray-400' : ''}
              `}
              onMouseEnter={() => setHoveredDay(day.date)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => !day.isFuture && day.seconds > 0 && onDayClick?.(day.date)}
              title={formatTooltip(day)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-500">
          <span>{t('studyStats.less')}</span>
          <div className="w-3 h-3 bg-gray-100 rounded-sm" />
          <div className="w-3 h-3 bg-green-200 rounded-sm" />
          <div className="w-3 h-3 bg-green-300 rounded-sm" />
          <div className="w-3 h-3 bg-green-400 rounded-sm" />
          <div className="w-3 h-3 bg-green-600 rounded-sm" />
          <span>{t('studyStats.more')}</span>
        </div>
      )}
    </div>
  );
}
