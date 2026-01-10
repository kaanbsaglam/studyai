/**
 * DayBreakdownModal Component
 *
 * Shows detailed breakdown of study time for a specific day,
 * grouped by classroom and document.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function DayBreakdownModal({ date, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/study-stats/day/${date}`);
        setData(response.data.data);
      } catch (err) {
        console.error('Failed to load day stats:', err);
        setError('Failed to load study data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Study Time</h3>
            <p className="text-sm text-gray-500">{formatDate(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-center py-4">{error}</p>
          ) : !data?.classrooms?.length ? (
            <p className="text-gray-500 text-center py-8">No study sessions on this day</p>
          ) : (
            <div className="space-y-3">
              {/* Total time */}
              <div className="text-center pb-3 border-b">
                <span className="text-2xl font-bold text-gray-900">
                  {formatTime(data.totalSeconds)}
                </span>
                <span className="text-gray-500 ml-2">total</span>
              </div>

              {/* Classroom breakdown */}
              {data.classrooms.map((classroom) => (
                <div
                  key={classroom.id || classroom.name}
                  className="border rounded-lg p-3"
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-medium ${
                        classroom.isDeleted ? 'text-gray-400 italic' : 'text-gray-900'
                      }`}
                    >
                      {classroom.name}
                      {classroom.isDeleted && (
                        <span className="ml-1 text-xs text-gray-400">(Deleted)</span>
                      )}
                    </span>
                    <span className="text-blue-600 font-medium">
                      {formatTime(classroom.totalSeconds)}
                    </span>
                  </div>

                  {/* Document breakdown within classroom */}
                  {classroom.documents?.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-gray-200 space-y-1">
                      {classroom.documents.map((doc) => (
                        <div
                          key={doc.id || doc.name}
                          className="flex justify-between text-sm"
                        >
                          <span
                            className={`truncate mr-2 ${
                              doc.isDeleted ? 'text-gray-400 italic' : 'text-gray-600'
                            }`}
                          >
                            {doc.name}
                            {doc.isDeleted && ' (Deleted)'}
                          </span>
                          <span className="text-gray-500 flex-shrink-0">
                            {formatTime(doc.seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
