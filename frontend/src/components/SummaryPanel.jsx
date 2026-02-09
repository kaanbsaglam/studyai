import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import DocumentSelector from './DocumentSelector';

export default function SummaryPanel({
  classroomId,
  documents = [],
  initialDocumentIds = [],
  compact,
  fullHeight,
}) {
  const { t } = useTranslation();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formFocusTopic, setFormFocusTopic] = useState('');
  const [formLength, setFormLength] = useState('medium');
  const [selectedDocIds, setSelectedDocIds] = useState(initialDocumentIds);
  const [savingAsNote, setSavingAsNote] = useState(false);
  const [savedAsNote, setSavedAsNote] = useState(false);

  const isGeneralKnowledge = selectedDocIds.length === 0;

  useEffect(() => {
    fetchSummaries();
  }, [classroomId]);

  useEffect(() => {
    setSelectedDocIds(initialDocumentIds);
  }, [initialDocumentIds]);

  const fetchSummaries = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/summaries`);
      setSummaries(response.data.data.summaries);
      setError('');
    } catch {
      setError(t('summaryPanel.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (isGeneralKnowledge && !formFocusTopic.trim()) {
      setError(t('summaryPanel.focusRequired'));
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/classrooms/${classroomId}/summaries`, {
        title: formTitle.trim(),
        focusTopic: formFocusTopic.trim() || undefined,
        length: formLength,
        documentIds: selectedDocIds,
      });

      setSummaries((prev) => [response.data.data.summary, ...prev]);
      setShowGenerateForm(false);
      setFormTitle('');
      setFormFocusTopic('');
      setFormLength('medium');

      // Show the newly created summary
      setActiveSummary(response.data.data.summary);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('summaryPanel.failedToGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSummary = async (summaryId) => {
    try {
      const response = await api.get(`/summaries/${summaryId}`);
      setActiveSummary(response.data.data.summary);
    } catch {
      setError(t('summaryPanel.failedToLoadSummary'));
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!confirm(t('summaryPanel.deleteConfirm'))) return;

    try {
      await api.delete(`/summaries/${summaryId}`);
      setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
      if (activeSummary?.id === summaryId) {
        setActiveSummary(null);
      }
    } catch {
      setError(t('summaryPanel.failedToDelete'));
    }
  };

  const getLengthLabel = (length) => {
    switch (length) {
      case 'short': return t('summaryPanel.brief');
      case 'medium': return t('summaryPanel.standard');
      case 'long': return t('summaryPanel.detailed');
      default: return length;
    }
  };

  const handleSaveAsNote = async () => {
    if (!activeSummary) return;

    setSavingAsNote(true);
    setError('');

    try {
      await api.post(`/classrooms/${classroomId}/notes`, {
        title: `${activeSummary.title} (Note)`,
        content: activeSummary.content,
      });
      setSavedAsNote(true);
      // Reset after 3 seconds
      setTimeout(() => setSavedAsNote(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('summaryPanel.failedToSaveNote'));
    } finally {
      setSavingAsNote(false);
    }
  };

  // View summary content
  if (activeSummary) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{activeSummary.title}</h3>
            <p className="text-sm text-gray-500">
              {getLengthLabel(activeSummary.length)} {t('summaryPanel.summary')}
              {activeSummary.focusTopic && ` - Focus: ${activeSummary.focusTopic}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAsNote}
              disabled={savingAsNote || savedAsNote}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                savedAsNote
                  ? 'bg-green-100 text-green-700'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
              title="Save as editable note"
            >
              {savingAsNote ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  Saving...
                </>
              ) : savedAsNote ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('summaryPanel.saved')}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t('summaryPanel.saveAsNote')}
                </>
              )}
            </button>
            <button
              onClick={() => {
                setActiveSummary(null);
                setSavedAsNote(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="p-6 flex-1 overflow-auto">
          <div className="prose prose-sm max-w-none">
            {activeSummary.content.split('\n').map((paragraph, idx) => (
              paragraph.trim() ? (
                <p key={idx} className="text-gray-700 mb-4">{paragraph}</p>
              ) : null
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate form view
  if (showGenerateForm) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{t('summaryPanel.generateSummary')}</h3>
          <button
            onClick={() => setShowGenerateForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4 flex-1 overflow-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('summaryPanel.titleLabel')}</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Overview"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {!compact && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('summaryPanel.sourceDocuments')}</label>
              <DocumentSelector
                documents={documents}
                selectedIds={selectedDocIds}
                onChange={setSelectedDocIds}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGeneralKnowledge ? `${t('summaryPanel.focusTopic')} *` : t('summaryPanel.focusTopicOptional')}
            </label>
            <input
              type="text"
              value={formFocusTopic}
              onChange={(e) => setFormFocusTopic(e.target.value)}
              placeholder={isGeneralKnowledge ? 'e.g., Machine Learning, World War II' : 'e.g., photosynthesis, key themes'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required={isGeneralKnowledge}
            />
            <p className="text-xs text-gray-500 mt-1">
              {isGeneralKnowledge
                ? t('summaryPanel.generalKnowledgeHint')
                : t('summaryPanel.documentHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('summaryPanel.summaryLength')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'short', label: t('summaryPanel.brief'), desc: t('summaryPanel.briefWords') },
                { value: 'medium', label: t('summaryPanel.standard'), desc: t('summaryPanel.standardWords') },
                { value: 'long', label: t('summaryPanel.detailed'), desc: t('summaryPanel.detailedWords') },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormLength(option.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    formLength === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={generating || !formTitle.trim() || (isGeneralKnowledge && !formFocusTopic.trim())}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </span>
              ) : (
                t('summaryPanel.generateSummary')
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isGeneralKnowledge
              ? t('summaryPanel.fromGeneral')
              : t('summaryPanel.fromDocs', { count: selectedDocIds.length })}
          </p>
        </form>
      </div>
    );
  }

  // List view
  const containerClass = compact
    ? 'flex flex-col h-full'
    : fullHeight
    ? 'bg-white rounded-lg shadow flex flex-col h-[calc(100vh-16rem)]'
    : 'bg-white rounded-lg shadow';

  return (
    <div className={containerClass}>
      {!compact && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('summaryPanel.title')}</h3>
            <p className="text-sm text-gray-500">{t('summaryPanel.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            {t('summaryPanel.generate')}
          </button>
        </div>
      )}

      {compact && (
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={() => setShowGenerateForm(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 text-sm"
          >
            {t('summaryPanel.generateBtn')}
          </button>
        </div>
      )}

      {error && !showGenerateForm && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2">{t('summaryPanel.noSummariesYet')}</p>
          <p className="text-sm">{t('summaryPanel.generateHint')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 flex-1 overflow-auto">
          {summaries.map((summary) => (
            <li key={summary.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1 cursor-pointer" onClick={() => handleViewSummary(summary.id)}>
                <p className="font-medium text-gray-900">{summary.title}</p>
                <p className="text-sm text-gray-500">
                  {getLengthLabel(summary.length)}
                  {summary.focusTopic && ` - ${summary.focusTopic}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewSummary(summary.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteSummary(summary.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
