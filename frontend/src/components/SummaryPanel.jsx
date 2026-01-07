import { useState, useEffect } from 'react';
import api from '../api/axios';
import DocumentSelector from './DocumentSelector';

export default function SummaryPanel({
  classroomId,
  documents = [],
  initialDocumentIds = [],
  compact,
  fullHeight,
}) {
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
      setError('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (isGeneralKnowledge && !formFocusTopic.trim()) {
      setError('Focus topic is required when no documents are selected');
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
      setError(err.response?.data?.error?.message || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSummary = async (summaryId) => {
    try {
      const response = await api.get(`/summaries/${summaryId}`);
      setActiveSummary(response.data.data.summary);
    } catch {
      setError('Failed to load summary');
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;

    try {
      await api.delete(`/summaries/${summaryId}`);
      setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
      if (activeSummary?.id === summaryId) {
        setActiveSummary(null);
      }
    } catch {
      setError('Failed to delete summary');
    }
  };

  const getLengthLabel = (length) => {
    switch (length) {
      case 'short': return 'Brief';
      case 'medium': return 'Standard';
      case 'long': return 'Detailed';
      default: return length;
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
              {getLengthLabel(activeSummary.length)} summary
              {activeSummary.focusTopic && ` - Focus: ${activeSummary.focusTopic}`}
            </p>
          </div>
          <button
            onClick={() => setActiveSummary(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
          <h3 className="text-lg font-medium text-gray-900">Generate Summary</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Documents</label>
              <DocumentSelector
                documents={documents}
                selectedIds={selectedDocIds}
                onChange={setSelectedDocIds}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Topic {isGeneralKnowledge ? '*' : '(optional)'}
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
                ? 'Required - summary will be generated from general knowledge'
                : 'Leave empty to summarize all content from selected documents'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary Length</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'short', label: 'Brief', desc: '150-250 words' },
                { value: 'medium', label: 'Standard', desc: '400-600 words' },
                { value: 'long', label: 'Detailed', desc: '800-1200 words' },
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
                'Generate Summary'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isGeneralKnowledge
              ? 'Summary will be generated from AI general knowledge'
              : `Summary will be generated from ${selectedDocIds.length} selected document${selectedDocIds.length !== 1 ? 's' : ''}`}
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
            <h3 className="text-lg font-medium text-gray-900">Summaries</h3>
            <p className="text-sm text-gray-500">AI-generated summaries of your study materials</p>
          </div>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            + Generate
          </button>
        </div>
      )}

      {compact && (
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={() => setShowGenerateForm(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 text-sm"
          >
            + Generate Summary
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
          <p className="mt-2">No summaries yet</p>
          <p className="text-sm">Generate summaries from documents or general knowledge</p>
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
