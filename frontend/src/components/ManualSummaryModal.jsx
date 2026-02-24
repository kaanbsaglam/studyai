import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

/**
 * Modal for manually creating or editing a summary.
 *
 * Props:
 *  - classroomId: string (required for create)
 *  - existingSummary: object | null (if provided, we are editing)
 *  - onClose: () => void
 *  - onSaved: (savedSummary) => void
 */
export default function ManualSummaryModal({ classroomId, existingSummary, onClose, onSaved, compact }) {
  const { t } = useTranslation();
  const isEditing = !!existingSummary;

  const [title, setTitle] = useState('');
  const [focusTopic, setFocusTopic] = useState('');
  const [content, setContent] = useState('');
  const [length, setLength] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingSummary) {
      setTitle(existingSummary.title || '');
      setFocusTopic(existingSummary.focusTopic || '');
      setContent(existingSummary.content || '');
      setLength(existingSummary.length || 'medium');
    }
  }, [existingSummary]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    setError('');

    try {
      let result;
      if (isEditing) {
        const response = await api.put(`/summaries/${existingSummary.id}`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || null,
          content: content.trim(),
          length,
        });
        result = response.data.data.summary;
      } else {
        const response = await api.post(`/classrooms/${classroomId}/summaries/manual`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || undefined,
          content: content.trim(),
          length,
        });
        result = response.data.data.summary;
      }
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('manualSummary.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? t('manualSummary.editTitle') : t('manualSummary.createTitle')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualSummary.summaryTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('manualSummary.summaryTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Focus Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualSummary.focusTopic')}
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder={t('manualSummary.focusTopicPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualSummary.category')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'short', label: t('summaryPanel.brief') },
                { value: 'medium', label: t('summaryPanel.standard') },
                { value: 'long', label: t('summaryPanel.detailed') },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLength(option.value)}
                  className={`p-2 rounded-lg border-2 text-center transition-colors text-sm ${
                    length === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualSummary.content')} *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('manualSummary.contentPlaceholder')}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {content.length > 0
                ? t('manualSummary.charCount', { count: content.length })
                : ''}
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.saving')}
                </span>
              ) : isEditing ? (
                t('common.save')
              ) : (
                t('manualSummary.createSummary')
              )}
            </button>
          </div>
        </form>
    </div>
  );
}
