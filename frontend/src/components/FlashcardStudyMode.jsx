import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

// Fisher-Yates shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sort cards for spaced repetition: due cards first, then by ease factor (hardest first)
 */
function sortCardsForReview(cards, progressMap) {
  const now = new Date();
  return [...cards].sort((a, b) => {
    const pa = progressMap[a.id];
    const pb = progressMap[b.id];

    // New cards (no progress) come after due cards but before future cards
    if (!pa && !pb) return a.position - b.position;
    if (!pa) return -1;
    if (!pb) return 1;

    const aDue = !pa.nextReviewAt || new Date(pa.nextReviewAt) <= now;
    const bDue = !pb.nextReviewAt || new Date(pb.nextReviewAt) <= now;

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    if (aDue && bDue) return pa.easeFactor - pb.easeFactor; // hardest first
    return new Date(pa.nextReviewAt) - new Date(pb.nextReviewAt);
  });
}

export default function FlashcardStudyMode({
  activeSet,
  compact,
  onClose,
}) {
  const { t } = useTranslation();

  // Mode: 'flip' = simple flip, 'study' = tracked study with SR
  const [studyMode, setStudyMode] = useState('flip');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [showingAnswer, setShowingAnswer] = useState(false);

  // Progress state
  const [progressMap, setProgressMap] = useState({}); // { cardId: progressObj }
  const [sessionResults, setSessionResults] = useState({}); // { cardId: { correct, confidence } }
  const [showSummary, setShowSummary] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // Confidence picker
  const [showConfidence, setShowConfidence] = useState(false);
  const [pendingCorrect, setPendingCorrect] = useState(null);

  // Load progress when entering study mode
  useEffect(() => {
    if (studyMode === 'study' && activeSet) {
      loadProgress();
    }
  }, [studyMode, activeSet?.id]);

  const loadProgress = async () => {
    try {
      const res = await api.get(`/flashcard-sets/${activeSet.id}/progress`);
      const map = {};
      for (const p of res.data.data.progress) {
        map[p.flashcardId] = p;
      }
      setProgressMap(map);
    } catch {
      // Progress loading is non-critical
    }
  };

  // Cards to display based on mode
  const displayCards = useMemo(() => {
    if (!activeSet?.cards) return [];
    if (studyMode === 'study' && !isShuffled) {
      return sortCardsForReview(activeSet.cards, progressMap);
    }
    if (isShuffled) return shuffledCards;
    return activeSet.cards;
  }, [activeSet, studyMode, isShuffled, shuffledCards, progressMap]);

  const currentCard = displayCards[currentCardIndex];

  const toggleShuffle = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledCards([]);
    } else {
      setShuffledCards(shuffleArray(activeSet.cards));
      setIsShuffled(true);
    }
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowingAnswer(false);
    setShowConfidence(false);
  };

  const goToCard = (idx) => {
    setCurrentCardIndex(idx);
    setIsFlipped(false);
    setShowingAnswer(false);
    setShowConfidence(false);
  };

  const nextCard = () => {
    if (currentCardIndex < displayCards.length - 1) {
      goToCard(currentCardIndex + 1);
    } else if (studyMode === 'study') {
      setShowSummary(true);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      goToCard(currentCardIndex - 1);
    }
  };

  const flipCard = () => {
    setIsFlipped((prev) => !prev);
    if (!isFlipped && studyMode === 'study') {
      setShowingAnswer(true);
    }
  };

  // Handle correct/wrong selection
  const handleAnswer = (correct) => {
    setPendingCorrect(correct);
    setShowConfidence(true);
  };

  // Handle confidence selection and save
  const handleConfidence = async (confidence) => {
    if (!currentCard || savingProgress) return;
    setSavingProgress(true);
    setShowConfidence(false);

    const cardId = currentCard.id;
    setSessionResults((prev) => ({
      ...prev,
      [cardId]: { correct: pendingCorrect, confidence },
    }));

    try {
      const res = await api.post(`/flashcard-sets/${activeSet.id}/progress`, {
        flashcardId: cardId,
        correct: pendingCorrect,
        confidence,
      });
      setProgressMap((prev) => ({ ...prev, [cardId]: res.data.data.progress }));
    } catch {
      // Non-critical
    } finally {
      setSavingProgress(false);
      setPendingCorrect(null);
      // Auto advance after a short delay
      setTimeout(() => nextCard(), 300);
    }
  };

  // Skip confidence - just save correct/wrong
  const skipConfidence = async () => {
    if (!currentCard || savingProgress) return;
    setSavingProgress(true);
    setShowConfidence(false);

    const cardId = currentCard.id;
    setSessionResults((prev) => ({
      ...prev,
      [cardId]: { correct: pendingCorrect, confidence: null },
    }));

    try {
      const res = await api.post(`/flashcard-sets/${activeSet.id}/progress`, {
        flashcardId: cardId,
        correct: pendingCorrect,
      });
      setProgressMap((prev) => ({ ...prev, [cardId]: res.data.data.progress }));
    } catch {
      // Non-critical
    } finally {
      setSavingProgress(false);
      setPendingCorrect(null);
      setTimeout(() => nextCard(), 300);
    }
  };

  const resetProgress = async () => {
    try {
      await api.delete(`/flashcard-sets/${activeSet.id}/progress`);
      setProgressMap({});
      setSessionResults({});
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowSummary(false);
      setShowConfidence(false);
    } catch {
      // Non-critical
    }
  };

  const restartSession = () => {
    setSessionResults({});
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    setShowingAnswer(false);
    setShowConfidence(false);
  };

  // Switch between modes
  const switchMode = (mode) => {
    setStudyMode(mode);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    setShowingAnswer(false);
    setShowConfidence(false);
    setIsShuffled(false);
    setShuffledCards([]);
    if (mode === 'flip') {
      setSessionResults({});
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (showSummary) return;
      if (showConfidence) {
        // Number keys 1-5 for confidence
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) {
          e.preventDefault();
          handleConfidence(num);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          skipConfidence();
        }
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          flipCard();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (studyMode === 'flip') nextCard();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevCard();
          break;
        case 'Escape':
          onClose();
          break;
        case 's':
        case 'S':
          if (studyMode === 'flip') toggleShuffle();
          break;
        // In study mode, after seeing answer: 1=wrong, 2=correct
        case '1':
          if (studyMode === 'study' && showingAnswer && isFlipped) {
            e.preventDefault();
            handleAnswer(false);
          }
          break;
        case '2':
          if (studyMode === 'study' && showingAnswer && isFlipped) {
            e.preventDefault();
            handleAnswer(true);
          }
          break;
      }
    },
    [currentCardIndex, isFlipped, isShuffled, shuffledCards, studyMode, showingAnswer, showConfidence, showSummary, displayCards, savingProgress]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Progress stats
  const stats = useMemo(() => {
    const total = displayCards.length;
    let mastered = 0;
    let learning = 0;
    let newCards = 0;
    const now = new Date();

    for (const card of displayCards) {
      const p = progressMap[card.id];
      if (!p) {
        newCards++;
      } else if (p.repetitions >= 3 && p.nextReviewAt && new Date(p.nextReviewAt) > now) {
        mastered++;
      } else {
        learning++;
      }
    }

    const sessionCorrect = Object.values(sessionResults).filter((r) => r.correct).length;
    const sessionWrong = Object.values(sessionResults).filter((r) => !r.correct).length;
    const sessionTotal = sessionCorrect + sessionWrong;

    return { total, mastered, learning, newCards, sessionCorrect, sessionWrong, sessionTotal };
  }, [displayCards, progressMap, sessionResults]);

  // Session summary view
  if (showSummary) {
    const accuracy = stats.sessionTotal > 0
      ? Math.round((stats.sessionCorrect / stats.sessionTotal) * 100)
      : 0;

    // Performance-based emoji and message
    let emoji, messageKey;
    if (stats.sessionTotal === 0) {
      emoji = '🔄';
      messageKey = 'flashcardStudy.noAnswers';
    } else if (accuracy >= 90) {
      emoji = '🎉';
      messageKey = 'flashcardStudy.excellent';
    } else if (accuracy >= 70) {
      emoji = '💪';
      messageKey = 'flashcardStudy.goodJob';
    } else if (accuracy >= 50) {
      emoji = '📖';
      messageKey = 'flashcardStudy.keepPracticing';
    } else {
      emoji = '📚';
      messageKey = 'flashcardStudy.needsWork';
    }

    return (
      <div className={compact ? 'flex flex-col h-full' : 'rounded-xl shadow-lg'} style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('flashcardStudy.sessionComplete')}</h3>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8 flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-6xl">{emoji}</div>
          <h4 className="text-2xl font-bold text-gray-900">{t(messageKey)}</h4>

          {/* Stats grid - only show if user answered at least one card */}
          {stats.sessionTotal > 0 ? (
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.sessionCorrect}</div>
                <div className="text-xs text-green-700 mt-1">{t('flashcardStudy.correct')}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.sessionWrong}</div>
                <div className="text-xs text-red-700 mt-1">{t('flashcardStudy.wrong')}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                <div className="text-xs text-blue-700 mt-1">{t('flashcardStudy.accuracy')}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('flashcardStudy.noAnswersHint')}</p>
          )}

          {/* Overall progress */}
          <div className="w-full max-w-md bg-gray-50 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">{t('flashcardStudy.overallProgress')}</div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-200">
              {stats.mastered > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(stats.mastered / stats.total) * 100}%` }}
                />
              )}
              {stats.learning > 0 && (
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${(stats.learning / stats.total) * 100}%` }}
                />
              )}
              {stats.newCards > 0 && (
                <div
                  className="bg-gray-400 transition-all"
                  style={{ width: `${(stats.newCards / stats.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {t('flashcardStudy.mastered')} ({stats.mastered})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                {t('flashcardStudy.learning')} ({stats.learning})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                {t('flashcardStudy.new')} ({stats.newCards})
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={restartSession}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t('flashcardStudy.studyAgain')}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {t('flashcardStudy.backToSets')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  // Get current card's session result and overall progress
  const cardResult = sessionResults[currentCard.id];
  const cardProgress = progressMap[currentCard.id];

  return (
    <div className={compact ? 'flex flex-col h-full' : 'rounded-xl shadow-lg'} style={{ backgroundColor: 'var(--card-bg)' }}>
      {/* Header */}
      <div className="px-6 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{activeSet.title}</h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('flashcardsPanel.cardOf', { current: currentCardIndex + 1, total: displayCards.length })}
            {isShuffled && ` ${t('flashcardsPanel.shuffled')}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Study mode toggle */}
          <button
            onClick={() => switchMode(studyMode === 'flip' ? 'study' : 'flip')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              studyMode === 'study' ? '' : ''
            }`}
            style={
              studyMode === 'study'
                ? { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', border: 'none' }
                : { backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }
            }
            title={studyMode === 'study' ? t('flashcardStudy.studyModeOn') : t('flashcardStudy.studyModeOff')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('flashcardStudy.studyMode')}
          </button>

          {studyMode === 'flip' && (
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-lg transition-colors ${
                isShuffled
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              title={isShuffled ? t('flashcardsPanel.returnToOrder') : t('flashcardsPanel.shuffleCards')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {studyMode === 'study' && (
            <button
              onClick={resetProgress}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={t('flashcardStudy.resetProgress')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar for study mode */}
      {studyMode === 'study' && (
        <div className="px-6 pb-1 pt-2">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
            {stats.mastered > 0 && (
              <div
                className="bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.mastered / stats.total) * 100}%` }}
              />
            )}
            {stats.learning > 0 && (
              <div
                className="bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${(stats.learning / stats.total) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{stats.mastered} {t('flashcardStudy.mastered')}</span>
            <span>{stats.learning} {t('flashcardStudy.learning')}</span>
            <span>{stats.newCards} {t('flashcardStudy.new')}</span>
          </div>
        </div>
      )}

      {/* Main flashcard area */}
      <div className="p-6 flex-1 overflow-auto flex flex-col">
        {/* Card with animation */}
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <div
            onClick={flipCard}
            className={`w-full max-w-lg cursor-pointer perspective-1000 ${
              savingProgress ? 'pointer-events-none opacity-70' : ''
            }`}
          >
            <div
              className={`relative min-h-[200px] transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.5s ease',
              }}
            >
              {/* Front face */}
              <div
                className="absolute inset-0 rounded-2xl shadow-lg border-2 flex items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden', backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="text-center w-full">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('flashcardsPanel.question')}
                  </div>
                  <p className="text-lg leading-relaxed" style={{ color: 'var(--text-primary)' }}>{currentCard.front}</p>
                  {cardProgress && studyMode === 'study' && (
                    <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="text-green-500">✓</span> {cardProgress.correct}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-red-500">✗</span> {cardProgress.wrong}
                      </span>
                      {cardProgress.confidence > 0 && (
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3 h-3 ${
                                star <= cardProgress.confidence ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Back face */}
              <div
                className="absolute inset-0 rounded-2xl shadow-lg border-2 flex items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: 'var(--card-bg)', borderColor: 'var(--accent)' }}
              >
                <div className="text-center w-full">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('flashcardsPanel.answer')}
                  </div>
                  <p className="text-lg leading-relaxed" style={{ color: 'var(--text-primary)' }}>{currentCard.back}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Study mode: correct/wrong + confidence */}
        {studyMode === 'study' && isFlipped && showingAnswer && !showConfidence && !cardResult && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-xs text-gray-400">{t('flashcardStudy.howDidYouDo')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer(false)}
                disabled={savingProgress}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('flashcardStudy.wrong')}
              </button>
              <button
                onClick={() => handleAnswer(true)}
                disabled={savingProgress}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100 transition-colors border border-green-100 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('flashcardStudy.correct')}
              </button>
            </div>
          </div>
        )}

        {/* Confidence picker */}
        {showConfidence && (
          <div className="mt-4 flex flex-col items-center gap-3 animate-fade-in">
            <p className="text-xs text-gray-400">{t('flashcardStudy.rateConfidence')}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => handleConfidence(level)}
                  disabled={savingProgress}
                  className={`w-10 h-10 rounded-full font-medium text-sm transition-all border-2 disabled:opacity-50 flex items-center justify-center ${
                    level <= 2
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300'
                      : level === 3
                      ? 'border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:border-yellow-300'
                      : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-300'
                  }`}
                  title={t(`flashcardStudy.confidence${level}`)}
                >
                  {level}
                </button>
              ))}
            </div>
            <button
              onClick={skipConfidence}
              disabled={savingProgress}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('flashcardStudy.skipConfidence')}
            </button>
          </div>
        )}

        {/* Card result indicator */}
        {cardResult && studyMode === 'study' && (
          <div className="mt-4 flex justify-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                cardResult.correct
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}
            >
              {cardResult.correct ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('flashcardStudy.markedCorrect')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('flashcardStudy.markedWrong')}
                </>
              )}
              {cardResult.confidence && (
                <span className="ml-1 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3 h-3 ${star <= cardResult.confidence ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-5">
          <button
            onClick={prevCard}
            disabled={currentCardIndex === 0}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.previous')}
          </button>

          {/* Card indicators */}
          <div className="flex gap-2 flex-wrap justify-center max-w-xs">
            {displayCards.map((card, idx) => {
              const result = sessionResults[card.id];
              let dotColor = 'bg-gray-300 hover:bg-gray-400';
              if (idx === currentCardIndex) {
                dotColor = 'bg-blue-600 scale-125';
              } else if (result?.correct === true) {
                dotColor = 'bg-green-500';
              } else if (result?.correct === false) {
                dotColor = 'bg-red-500';
              }
              return (
                <button
                  key={idx}
                  onClick={() => goToCard(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${dotColor}`}
                />
              );
            })}
          </div>

          <button
            onClick={nextCard}
            disabled={currentCardIndex === displayCards.length - 1 && studyMode === 'flip'}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {studyMode === 'study' && currentCardIndex === displayCards.length - 1
              ? t('flashcardStudy.finish')
              : t('common.next')}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Keyboard hints */}
        <p className="text-center text-[10px] text-gray-400 mt-3">
          {studyMode === 'flip'
            ? t('flashcardsPanel.tip')
            : t('flashcardStudy.studyTip')}
        </p>
      </div>
    </div>
  );
}
