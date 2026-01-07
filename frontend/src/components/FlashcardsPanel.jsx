import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function FlashcardsPanel({ classroomId, hasReadyDocuments }) {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [activeSet, setActiveSet] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formFocusTopic, setFormFocusTopic] = useState('');
  const [formCount, setFormCount] = useState(10);

  useEffect(() => {
    fetchFlashcardSets();
  }, [classroomId]);

  const fetchFlashcardSets = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/flashcard-sets`);
      setFlashcardSets(response.data.data.flashcardSets);
      setError('');
    } catch (err) {
      setError('Failed to load flashcard sets');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/classrooms/${classroomId}/flashcard-sets`, {
        title: formTitle.trim(),
        focusTopic: formFocusTopic.trim() || undefined,
        count: formCount,
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
      setError(err.response?.data?.error?.message || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSet = async (setId) => {
    try {
      const response = await api.get(`/flashcard-sets/${setId}`);
      setActiveSet(response.data.data.flashcardSet);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (err) {
      setError('Failed to load flashcard set');
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!confirm('Are you sure you want to delete this flashcard set?')) return;

    try {
      await api.delete(`/flashcard-sets/${setId}`);
      setFlashcardSets((prev) => prev.filter((s) => s.id !== setId));
      if (activeSet?.id === setId) {
        setActiveSet(null);
      }
    } catch (err) {
      setError('Failed to delete flashcard set');
    }
  };

  const nextCard = () => {
    if (currentCardIndex < activeSet.cards.length - 1) {
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

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped((prev) => !prev);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentCardIndex < activeSet.cards.length - 1) {
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
      }
    },
    [activeSet, currentCardIndex]
  );

  useEffect(() => {
    if (activeSet) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeSet, handleKeyDown]);

  // Study mode view
  if (activeSet) {
    const currentCard = activeSet.cards[currentCardIndex];

    return (
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{activeSet.title}</h3>
            <p className="text-sm text-gray-500">
              Card {currentCardIndex + 1} of {activeSet.cards.length}
              {activeSet.focusTopic && ` - Focus: ${activeSet.focusTopic}`}
            </p>
          </div>
          <button
            onClick={() => setActiveSet(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Flashcard */}
        <div className="p-6">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[250px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-inner cursor-pointer flex items-center justify-center p-8 transition-all hover:shadow-md border border-blue-100"
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-blue-500 mb-4">
                {isFlipped ? 'Answer' : 'Question'} - Click to flip
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
              Previous
            </button>

            <div className="flex gap-1">
              {activeSet.cards.map((_, idx) => (
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
              disabled={currentCardIndex === activeSet.cards.length - 1}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Tip: Press Space to flip, Arrow keys to navigate
          </p>
        </div>
      </div>
    );
  }

  // Generate form view
  if (showGenerateForm) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Generate Flashcards</h3>
          <button
            onClick={() => setShowGenerateForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Topic (optional)
            </label>
            <input
              type="text"
              value={formFocusTopic}
              onChange={(e) => setFormFocusTopic(e.target.value)}
              placeholder="e.g., photosynthesis, cell division"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to cover all topics from your documents
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Cards
            </label>
            <select
              value={formCount}
              onChange={(e) => setFormCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5 cards</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value={20}>20 cards</option>
              <option value={30}>30 cards</option>
              <option value={50}>50 cards</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={generating || !formTitle.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </span>
              ) : (
                'Generate Flashcards'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Flashcards will be generated from all documents in this classroom
          </p>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Flashcards</h3>
          <p className="text-sm text-gray-500">Study with AI-generated flashcards</p>
        </div>
        <button
          onClick={() => setShowGenerateForm(true)}
          disabled={!hasReadyDocuments}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Generate
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
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
          <p className="mt-2">No flashcard sets yet</p>
          <p className="text-sm">
            {hasReadyDocuments
              ? 'Generate flashcards to start studying'
              : 'Upload and process documents first'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {flashcardSets.map((set) => (
            <li key={set.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleViewSet(set.id)}
              >
                <p className="font-medium text-gray-900">{set.title}</p>
                <p className="text-sm text-gray-500">
                  {set._count?.cards || set.cards?.length || 0} cards
                  {set.focusTopic && ` - ${set.focusTopic}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewSet(set.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  Study
                </button>
                <button
                  onClick={() => handleDeleteSet(set.id)}
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
