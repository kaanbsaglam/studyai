import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import DocumentSelector from './DocumentSelector';
import ManualFlashcardModal from './ManualFlashcardModal';
import FlashcardStudyMode from './FlashcardStudyMode';
import ThreeDotMenu from './ThreeDotMenu';
import FlashcardsPdfDocument from './pdf/FlashcardsPdfDocument';
import { downloadPdf } from '../utils/exportHelpers';

export default function FlashcardsPanel({
  classroomId,
  documents = [],
  initialDocumentIds = [],
  compact,
  fullHeight,
}) {
  const { t } = useTranslation();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [activeSet, setActiveSet] = useState(null);

  // Manual create/edit modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formFocusTopic, setFormFocusTopic] = useState('');
  const [formCount, setFormCount] = useState(10);
  const [selectedDocIds, setSelectedDocIds] = useState(initialDocumentIds);

  const isGeneralKnowledge = selectedDocIds.length === 0;

  useEffect(() => {
    fetchFlashcardSets();
  }, [classroomId]);

  // Update selected docs when initialDocumentIds changes
  useEffect(() => {
    setSelectedDocIds(initialDocumentIds);
  }, [initialDocumentIds]);

  const fetchFlashcardSets = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/flashcard-sets`);
      setFlashcardSets(response.data.data.flashcardSets);
      setError('');
    } catch {
      setError(t('flashcardsPanel.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    // For general knowledge, focus topic is required
    if (isGeneralKnowledge && !formFocusTopic.trim()) {
      setError(t('flashcardsPanel.focusRequired'));
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/classrooms/${classroomId}/flashcard-sets`, {
        title: formTitle.trim(),
        focusTopic: formFocusTopic.trim() || undefined,
        count: formCount,
        documentIds: selectedDocIds,
      });

      setFlashcardSets((prev) => [response.data.data.flashcardSet, ...prev]);
      setShowGenerateForm(false);
      setFormTitle('');
      setFormFocusTopic('');
      setFormCount(10);

      // Show the newly created set
      setActiveSet(response.data.data.flashcardSet);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('flashcardsPanel.failedToGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSet = async (setId) => {
    try {
      const response = await api.get(`/flashcard-sets/${setId}`);
      const set = response.data.data.flashcardSet;
      setActiveSet(set);
    } catch {
      setError(t('flashcardsPanel.failedToLoadSet'));
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!confirm(t('flashcardsPanel.deleteConfirm'))) return;

    try {
      await api.delete(`/flashcard-sets/${setId}`);
      setFlashcardSets((prev) => prev.filter((s) => s.id !== setId));
      if (activeSet?.id === setId) {
        setActiveSet(null);
      }
    } catch {
      setError(t('flashcardsPanel.failedToDelete'));
    }
  };

  const handleEditSet = async (setId) => {
    try {
      const response = await api.get(`/flashcard-sets/${setId}`);
      setEditingSet(response.data.data.flashcardSet);
      setShowManualModal(true);
    } catch {
      setError(t('flashcardsPanel.failedToLoadSet'));
    }
  };

  const handleExportSet = async (setId) => {
    try {
      const response = await api.get(`/flashcard-sets/${setId}`);
      const set = response.data.data.flashcardSet;
      await downloadPdf(
        <FlashcardsPdfDocument
          flashcardSet={set}
          frontLabel={t('flashcardsPanel.question')}
          backLabel={t('flashcardsPanel.answer')}
        />,
        set.title
      );
    } catch {
      setError(t('flashcardsPanel.failedToLoadSet'));
    }
  };

  const handleManualSaved = (savedSet) => {
    if (editingSet) {
      // Update in list
      setFlashcardSets((prev) =>
        prev.map((s) => (s.id === savedSet.id ? { ...savedSet, _count: { cards: savedSet.cards?.length || 0 } } : s))
      );
      // If currently viewing this set, refresh it
      if (activeSet?.id === savedSet.id) {
        setActiveSet(savedSet);
      }
    } else {
      // Add new to list
      setFlashcardSets((prev) => [{ ...savedSet, _count: { cards: savedSet.cards?.length || 0 } }, ...prev]);
    }
    setShowManualModal(false);
    setEditingSet(null);
  };

  // Study mode view - delegated to FlashcardStudyMode component
  if (activeSet) {
    return (
      <FlashcardStudyMode
        activeSet={activeSet}
        compact={compact}
        onClose={() => setActiveSet(null)}
      />
    );
  }

  // Generate form view
  if (showGenerateForm) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-transparent flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{t('flashcardsPanel.generateFlashcards')}</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('flashcardsPanel.titleLabel')}
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., Biology Chapter 5 Review"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Document selector */}
          {!compact && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('flashcardsPanel.sourceDocuments')}
              </label>
              <DocumentSelector
                documents={documents}
                selectedIds={selectedDocIds}
                onChange={setSelectedDocIds}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGeneralKnowledge ? t('flashcardsPanel.focusTopic') + ' *' : t('flashcardsPanel.focusTopicOptional')}
            </label>
            <input
              type="text"
              value={formFocusTopic}
              onChange={(e) => setFormFocusTopic(e.target.value)}
              placeholder={isGeneralKnowledge ? 'e.g., World War II, Photosynthesis' : 'e.g., photosynthesis, cell division'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required={isGeneralKnowledge}
            />
            <p className="text-xs text-gray-500 mt-1">
              {isGeneralKnowledge
                ? t('flashcardsPanel.generalKnowledgeHint')
                : t('flashcardsPanel.documentHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('flashcardsPanel.numberOfCards')}
            </label>
            <select
              value={formCount}
              onChange={(e) => setFormCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>{`5 ${t('flashcardsPanel.cards')}`}</option>
              <option value={10}>{`10 ${t('flashcardsPanel.cards')}`}</option>
              <option value={15}>{`15 ${t('flashcardsPanel.cards')}`}</option>
              <option value={20}>{`20 ${t('flashcardsPanel.cards')}`}</option>
              <option value={30}>{`30 ${t('flashcardsPanel.cards')}`}</option>
              <option value={50}>{`50 ${t('flashcardsPanel.cards')}`}</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={generating || !formTitle.trim() || (isGeneralKnowledge && !formFocusTopic.trim())}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.generating')}
                </span>
              ) : (
                t('flashcardsPanel.generateFlashcards')
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isGeneralKnowledge
              ? t('flashcardsPanel.fromGeneral')
              : t('flashcardsPanel.fromDocs', { count: selectedDocIds.length })}
          </p>
        </form>
      </div>
    );
  }

  // Manual create/edit view
  if (showManualModal) {
    return (
      <ManualFlashcardModal
        classroomId={classroomId}
        existingSet={editingSet}
        compact={compact}
        onClose={() => { setShowManualModal(false); setEditingSet(null); }}
        onSaved={handleManualSaved}
      />
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-transparent flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('flashcardsPanel.title')}</h3>
            <p className="text-sm text-gray-500">{t('flashcardsPanel.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSet(null);
                setShowManualModal(true);
              }}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-full font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 dark:hover:border-blue-400"
            >
              {t('flashcardsPanel.createManual')}
            </button>
            <button
              onClick={() => setShowGenerateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 dark:hover:bg-blue-500/80"
            >
              {t('flashcardsPanel.generate')}
            </button>
          </div>
        </div>
      )}

      {compact && (
        <div className="p-3 border-b border-gray-200 dark:border-transparent flex gap-2">
          <button
            onClick={() => {
              setEditingSet(null);
              setShowManualModal(true);
            }}
            className="flex-1 h-10 px-4 border border-blue-600 text-blue-600 rounded-full font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 dark:hover:border-blue-400 text-sm inline-flex items-center justify-center leading-none"
          >
            {t('flashcardsPanel.createManual')}
          </button>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex-1 h-10 px-4 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 dark:hover:bg-blue-500/80 text-sm inline-flex items-center justify-center leading-none"
          >
            {t('flashcardsPanel.generateBtn')}
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
          <p className="mt-2 text-gray-500">{t('common.loading')}</p>
        </div>
      ) : flashcardSets.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="mt-2">{t('flashcardsPanel.noSetsYet')}</p>
          <p className="text-sm">
            {t('flashcardsPanel.generateToStart')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-transparent flex-1 overflow-auto">
          {flashcardSets.map((set) => (
            <li key={set.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleViewSet(set.id)}
              >
                <p className="font-medium text-gray-900">{set.title}</p>
                <p className="text-sm text-gray-500">
                  {set._count?.cards || set.cards?.length || 0} {t('flashcardsPanel.cards')}
                  {set.focusTopic && ` - ${set.focusTopic}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewSet(set.id)}
                  className="h-8 px-3 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 rounded-full inline-flex items-center justify-center leading-none"
                >
                  {t('flashcardsPanel.study')}
                </button>
                <ThreeDotMenu
                  items={[
                    {
                      label: t('common.edit'),
                      icon: (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      ),
                      onClick: () => handleEditSet(set.id),
                    },
                    {
                      label: t('export.exportPdf'),
                      icon: (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ),
                      onClick: () => handleExportSet(set.id),
                    },
                    {
                      label: t('common.delete'),
                      icon: (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      ),
                      onClick: () => handleDeleteSet(set.id),
                      danger: true,
                    },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
