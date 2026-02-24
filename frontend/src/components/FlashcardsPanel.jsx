import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import DocumentSelector from './DocumentSelector';
import ManualFlashcardModal from './ManualFlashcardModal';

// Fisher-Yates shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);

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
      setCurrentCardIndex(0);
      setIsFlipped(false);
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
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setIsShuffled(false);
      setShuffledCards([]);
    } catch {
      setError(t('flashcardsPanel.failedToLoadSet'));
    }
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      // Return to original order
      setIsShuffled(false);
      setShuffledCards([]);
    } else {
      // Shuffle cards
      setShuffledCards(shuffleArray(activeSet.cards));
      setIsShuffled(true);
    }
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Get the cards to display (shuffled or original)
  const displayCards = isShuffled ? shuffledCards : (activeSet?.cards || []);

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

  const nextCard = () => {
    if (currentCardIndex < displayCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  // Keyboard navigation for study mode
  const handleKeyDown = useCallback(
    (e) => {
      if (!activeSet) return;

      const cards = isShuffled ? shuffledCards : activeSet.cards;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped((prev) => !prev);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentCardIndex < cards.length - 1) {
            setCurrentCardIndex((prev) => prev + 1);
            setIsFlipped(false);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentCardIndex > 0) {
            setCurrentCardIndex((prev) => prev - 1);
            setIsFlipped(false);
          }
          break;
        case 'Escape':
          setActiveSet(null);
          break;
        case 's':
        case 'S':
          // Toggle shuffle with 's' key
          if (activeSet) {
            if (isShuffled) {
              setIsShuffled(false);
              setShuffledCards([]);
            } else {
              setShuffledCards(shuffleArray(activeSet.cards));
              setIsShuffled(true);
            }
            setCurrentCardIndex(0);
            setIsFlipped(false);
          }
          break;
      }
    },
    [activeSet, currentCardIndex, isShuffled, shuffledCards]
  );

  useEffect(() => {
    if (activeSet) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeSet, handleKeyDown]);

  // Study mode view
  if (activeSet) {
    const currentCard = displayCards[currentCardIndex];

    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{activeSet.title}</h3>
            <p className="text-sm text-gray-500">
              {t('flashcardsPanel.cardOf', { current: currentCardIndex + 1, total: displayCards.length })}
              {isShuffled && ` ${t('flashcardsPanel.shuffled')}`}
              {activeSet.focusTopic && ` - ${t('flashcardsPanel.focus', { topic: activeSet.focusTopic })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-lg transition-colors ${
                isShuffled
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={isShuffled ? t('flashcardsPanel.returnToOrder') : t('flashcardsPanel.shuffleCards')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setActiveSet(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Flashcard */}
        <div className="p-6 flex-1 overflow-auto">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[200px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-inner cursor-pointer flex items-center justify-center p-8 transition-all hover:shadow-md border border-blue-100"
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-blue-500 mb-4">
                {isFlipped ? t('flashcardsPanel.answer') : t('flashcardsPanel.question')} - {t('flashcardsPanel.clickToFlip')}
              </p>
              <p className="text-xl text-gray-800">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('common.previous')}
            </button>

            <div className="flex gap-1">
              {displayCards.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentCardIndex(idx);
                    setIsFlipped(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentCardIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextCard}
              disabled={currentCardIndex === displayCards.length - 1}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {t('common.next')}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {t('flashcardsPanel.tip')}
          </p>
        </div>
      </div>
    );
  }

  // Generate form view
  if (showGenerateForm) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
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
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md font-medium hover:bg-blue-50"
            >
              {t('flashcardsPanel.createManual')}
            </button>
            <button
              onClick={() => setShowGenerateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
            >
              {t('flashcardsPanel.generate')}
            </button>
          </div>
        </div>
      )}

      {compact && (
        <div className="p-3 border-b border-gray-200 flex gap-2">
          <button
            onClick={() => {
              setEditingSet(null);
              setShowManualModal(true);
            }}
            className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-md font-medium hover:bg-blue-50 text-sm"
          >
            {t('flashcardsPanel.createManual')}
          </button>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 text-sm"
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
        <ul className="divide-y divide-gray-200 flex-1 overflow-auto">
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
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {t('flashcardsPanel.study')}
                </button>
                <button
                  onClick={() => handleEditSet(set.id)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteSet(set.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
