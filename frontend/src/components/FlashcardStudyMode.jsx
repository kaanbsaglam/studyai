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

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [showingAnswer, setShowingAnswer] = useState(false);

  // Progress state
  const [progressMap, setProgressMap] = useState({}); // { cardId: progressObj }
  const [sessionResults, setSessionResults] = useState({}); // { cardId: { correct } }
  const [showSummary, setShowSummary] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // Load progress on mount
  useEffect(() => {
    if (activeSet) {
      loadProgress();
    }
  }, [activeSet?.id]);

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

  // Initial card order — computed once from the progress at load time, not re-sorted mid-session
  const [initialOrder, setInitialOrder] = useState([]);

  useEffect(() => {
    if (activeSet?.cards && Object.keys(progressMap).length > 0) {
      setInitialOrder(sortCardsForReview(activeSet.cards, progressMap));
    } else if (activeSet?.cards && initialOrder.length === 0) {
      setInitialOrder([...activeSet.cards]);
    }
  }, [activeSet?.cards, Object.keys(progressMap).length > 0]);

  // Cards to display — use shuffle if active, otherwise the stable initial order
  const displayCards = useMemo(() => {
    if (!activeSet?.cards) return [];
    if (isShuffled) return shuffledCards;
    return initialOrder.length > 0 ? initialOrder : activeSet.cards;
  }, [activeSet, isShuffled, shuffledCards, initialOrder]);

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
  };

  const goToCard = (idx) => {
    setCurrentCardIndex(idx);
    setIsFlipped(false);
    setShowingAnswer(false);
  };

  const nextCard = () => {
    if (currentCardIndex < displayCards.length - 1) {
      goToCard(currentCardIndex + 1);
    } else {
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
    if (!isFlipped) {
      setShowingAnswer(true);
    }
  };

  // Handle correct/wrong — save immediately and advance
  const handleAnswer = async (correct) => {
    if (!currentCard || savingProgress) return;
    setSavingProgress(true);

    const cardId = currentCard.id;
    setSessionResults((prev) => ({
      ...prev,
      [cardId]: { correct },
    }));

    try {
      const res = await api.post(`/flashcard-sets/${activeSet.id}/progress`, {
        flashcardId: cardId,
        correct,
        confidence: correct ? 4 : 1,
      });
      setProgressMap((prev) => ({ ...prev, [cardId]: res.data.data.progress }));
    } catch {
      // Non-critical
    } finally {
      setSavingProgress(false);
      setTimeout(() => nextCard(), 300);
    }
  };

  const resetProgress = async () => {
    try {
      await api.delete(`/flashcard-sets/${activeSet.id}/progress`);
      setProgressMap({});
      setSessionResults({});
      setInitialOrder([...activeSet.cards]);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowSummary(false);
    } catch {
      // Non-critical
    }
  };

  const restartSession = () => {
    setSessionResults({});
    setInitialOrder(sortCardsForReview(activeSet.cards, progressMap));
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    setShowingAnswer(false);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (showSummary) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          flipCard();
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
          toggleShuffle();
          break;
        // After seeing answer: 1=wrong, 2=correct
        case '1':
          if (showingAnswer && isFlipped) {
            e.preventDefault();
            handleAnswer(false);
          }
          break;
        case '2':
          if (showingAnswer && isFlipped) {
            e.preventDefault();
            handleAnswer(true);
          }
          break;
      }
    },
    [currentCardIndex, isFlipped, isShuffled, shuffledCards, showingAnswer, showSummary, displayCards, savingProgress]
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

          <button
            onClick={resetProgress}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title={t('flashcardStudy.resetProgress')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

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

      {/* Progress bar */}
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
                  {cardProgress && (
                    <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="text-green-500">✓</span> {cardProgress.correct}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-red-500">✗</span> {cardProgress.wrong}
                      </span>
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

        {/* Correct / Wrong buttons — always shown when answer is visible */}
        {isFlipped && showingAnswer && (
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
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {currentCardIndex === displayCards.length - 1
              ? t('flashcardStudy.finish')
              : t('common.next')}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Keyboard hints */}
        <p className="text-center text-[10px] text-gray-400 mt-3">
          {t('flashcardStudy.studyTip')}
        </p>
      </div>
    </div>
  );
}
