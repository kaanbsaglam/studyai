import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import DocumentSelector from './DocumentSelector';
import ManualQuizModal from './ManualQuizModal';

export default function QuizPanel({
  classroomId,
  documents = [],
  initialDocumentIds = [],
  compact,
  fullHeight,
}) {
  const { t } = useTranslation();
  const [quizSets, setQuizSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [savingAttempt, setSavingAttempt] = useState(false);

  // Manual create/edit modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);


  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formFocusTopic, setFormFocusTopic] = useState('');
  const [formCount, setFormCount] = useState(10);
  const [selectedDocIds, setSelectedDocIds] = useState(initialDocumentIds);

  const isGeneralKnowledge = selectedDocIds.length === 0;

  useEffect(() => {
    fetchQuizSets();
  }, [classroomId]);

  useEffect(() => {
    setSelectedDocIds(initialDocumentIds);
  }, [initialDocumentIds]);

  // Shuffle answers when question changes
  useEffect(() => {
    if (activeQuiz && activeQuiz.questions[currentQuestionIndex]) {
      const q = activeQuiz.questions[currentQuestionIndex];
      const allAnswers = [q.correctAnswer, ...q.wrongAnswers];
      setShuffledAnswers(shuffleArray(allAnswers));
    }
  }, [activeQuiz, currentQuestionIndex]);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchQuizSets = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/quiz-sets`);
      setQuizSets(response.data.data.quizSets);
      setError('');
    } catch {
      setError(t('quizPanel.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (isGeneralKnowledge && !formFocusTopic.trim()) {
      setError(t('quizPanel.focusRequired'));
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await api.post(`/classrooms/${classroomId}/quiz-sets`, {
        title: formTitle.trim(),
        focusTopic: formFocusTopic.trim() || undefined,
        count: formCount,
        documentIds: selectedDocIds,
      });

      setQuizSets((prev) => [response.data.data.quizSet, ...prev]);
      setShowGenerateForm(false);
      setFormTitle('');
      setFormFocusTopic('');
      setFormCount(10);

      // Start the newly created quiz
      startQuiz(response.data.data.quizSet);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('quizPanel.failedToGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewQuiz = async (quizId) => {
    try {
      const [quizRes, attemptsRes] = await Promise.all([
        api.get(`/quiz-sets/${quizId}`),
        api.get(`/quiz-sets/${quizId}/attempts`),
      ]);
      setAttempts(attemptsRes.data.data.attempts);
      startQuiz(quizRes.data.data.quizSet);
    } catch {
      setError(t('quizPanel.failedToLoadQuiz'));
    }
  };

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm(t('quizPanel.deleteConfirm'))) return;

    try {
      await api.delete(`/quiz-sets/${quizId}`);
      setQuizSets((prev) => prev.filter((q) => q.id !== quizId));
      if (activeQuiz?.id === quizId) {
        setActiveQuiz(null);
      }
    } catch {
      setError(t('quizPanel.failedToDelete'));
    }
  };
  
  const handleEditQuiz = async (quizId) => {
    try {
      const response = await api.get(`/quiz-sets/${quizId}`);
      setEditingQuiz(response.data.data.quizSet);
      setShowManualModal(true);
    } catch {
      setError(t('quizPanel.failedToLoadQuiz'));
    }
  };

  const handleManualSaved = (savedQuiz) => {
    if (editingQuiz) {
      setQuizSets((prev) =>
        prev.map((q) => (q.id === savedQuiz.id ? { ...savedQuiz, _count: { questions: savedQuiz.questions?.length || 0 } } : q))
      );
    } else {
      setQuizSets((prev) => [{ ...savedQuiz, _count: { questions: savedQuiz.questions?.length || 0 } }, ...prev]);
    }
    setShowManualModal(false);
    setEditingQuiz(null);
  };

  const handleAnswerSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setShowResult(true);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz completed - score is already correct (updated by handleSubmitAnswer)
      setQuizCompleted(true);

      // Save attempt to backend
      setSavingAttempt(true);
      try {
        await api.post(`/quiz-sets/${activeQuiz.id}/attempts`, {
          score,  // Already includes all answers from handleSubmitAnswer
          totalQuestions: activeQuiz.questions.length,
        });
        // Refresh attempts
        const attemptsRes = await api.get(`/quiz-sets/${activeQuiz.id}/attempts`);
        setAttempts(attemptsRes.data.data.attempts);
      } catch (err) {
        console.error('Failed to save attempt:', err);
        setError(t('quizPanel.failedToSaveAttempt'));
      } finally {
        setSavingAttempt(false);
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
    setError('');
  };

  // Quiz completed view
  if (activeQuiz && quizCompleted) {
    const percentage = Math.round((score / activeQuiz.questions.length) * 100);
    const getGrade = (pct) => {
      if (pct >= 90) return { text: t('quizPanel.excellent'), color: 'text-green-600' };
      if (pct >= 70) return { text: t('quizPanel.goodJob'), color: 'text-blue-600' };
      if (pct >= 50) return { text: t('quizPanel.keepPracticing'), color: 'text-yellow-600' };
      return { text: t('quizPanel.needsImprovement'), color: 'text-red-600' };
    };
    const grade = getGrade(percentage);

    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{t('quizPanel.quizComplete')}</h3>
          <button onClick={() => setActiveQuiz(null)} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-gray-900 mb-2">{percentage}%</div>
            <p className={`text-xl font-medium ${grade.color} mb-4`}>{grade.text}</p>
            <p className="text-gray-600">
              {t('quizPanel.scoreResult', { score, total: activeQuiz.questions.length })}
            </p>
            {savingAttempt && (
              <p className="text-sm text-gray-400 mt-2">{t('quizPanel.savingResult')}</p>
            )}
          </div>

          <div className="flex gap-4 justify-center mb-8">
            <button
              onClick={handleRestartQuiz}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('quizPanel.tryAgain')}
            </button>
            <button
              onClick={() => setActiveQuiz(null)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('quizPanel.backToList')}
            </button>
          </div>

          {/* Attempt History */}
          {attempts.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('quizPanel.previousAttempts')}</h4>
              <div className="space-y-2">
                {attempts.slice(0, 5).map((attempt, idx) => {
                  const attemptPct = Math.round((attempt.score / attempt.totalQuestions) * 100);
                  const attemptGrade = getGrade(attemptPct);
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded"
                    >
                      <span className="text-gray-500">
                        {idx === 0 ? t('quizPanel.justNow') : new Date(attempt.completedAt).toLocaleDateString()}
                      </span>
                      <span className={`font-medium ${attemptGrade.color}`}>
                        {attempt.score}/{attempt.totalQuestions} ({attemptPct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              {attempts.length > 5 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {t('quizPanel.showingAttempts', { total: attempts.length })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active quiz view
  if (activeQuiz) {
    const currentQuestion = activeQuiz.questions[currentQuestionIndex];

    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{activeQuiz.title}</h3>
            <p className="text-sm text-gray-500">
              {t('quizPanel.questionOf', { current: currentQuestionIndex + 1, total: activeQuiz.questions.length })}
              {activeQuiz.focusTopic && ` - ${activeQuiz.focusTopic}`}
            </p>
          </div>
          <button onClick={() => setActiveQuiz(null)} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {/* Question */}
          <p className="text-lg font-medium text-gray-900 mb-6">{currentQuestion.question}</p>

          {/* Answers */}
          <div className="space-y-3">
            {shuffledAnswers.map((answer, idx) => {
              const isSelected = selectedAnswer === answer;
              const isCorrect = answer === currentQuestion.correctAnswer;
              const showCorrect = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(answer)}
                  disabled={showResult}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : showWrong
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{answer}</span>
                    {showCorrect && (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {showWrong && (
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-500">{t('quizPanel.score', { score, total: currentQuestionIndex + (showResult ? 1 : 0) })}</p>

            {!showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.submit')}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? t('quizPanel.nextQuestion') : t('quizPanel.seeResults')}
              </button>
            )}
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
          <h3 className="text-lg font-medium text-gray-900">{t('quizPanel.generateQuiz')}</h3>
          <button onClick={() => setShowGenerateForm(false)} className="text-gray-500 hover:text-gray-700">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizPanel.titleLabel')}</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Review Quiz"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {!compact && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizPanel.sourceDocuments')}</label>
              <DocumentSelector
                documents={documents}
                selectedIds={selectedDocIds}
                onChange={setSelectedDocIds}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGeneralKnowledge ? t('quizPanel.focusTopic') + ' *' : t('quizPanel.focusTopicOptional')}
            </label>
            <input
              type="text"
              value={formFocusTopic}
              onChange={(e) => setFormFocusTopic(e.target.value)}
              placeholder={isGeneralKnowledge ? 'e.g., World War II, Photosynthesis' : 'e.g., photosynthesis'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required={isGeneralKnowledge}
            />
            <p className="text-xs text-gray-500 mt-1">
              {isGeneralKnowledge
                ? t('quizPanel.generalKnowledgeHint')
                : t('quizPanel.documentHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizPanel.numberOfQuestions')}</label>
            <select
              value={formCount}
              onChange={(e) => setFormCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5 {t('quizPanel.questions')}</option>
              <option value={10}>10 {t('quizPanel.questions')}</option>
              <option value={15}>15 {t('quizPanel.questions')}</option>
              <option value={20}>20 {t('quizPanel.questions')}</option>
              <option value={30}>30 {t('quizPanel.questions')}</option>
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
                t('quizPanel.generateQuiz')
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isGeneralKnowledge
              ? t('quizPanel.fromGeneral')
              : t('quizPanel.fromDocs', { count: selectedDocIds.length })}
          </p>
        </form>
      </div>
    );
  }

  // Manual create/edit view
  if (showManualModal) {
    return (
      <ManualQuizModal
        classroomId={classroomId}
        existingQuiz={editingQuiz}
        compact={compact}
        onClose={() => { setShowManualModal(false); setEditingQuiz(null); }}
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
            <h3 className="text-lg font-medium text-gray-900">{t('quizPanel.title')}</h3>
            <p className="text-sm text-gray-500">{t('quizPanel.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingQuiz(null);
                setShowManualModal(true);
              }}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md font-medium hover:bg-blue-50"
            >
              {t('quizPanel.createManual')}
            </button>
            <button
              onClick={() => setShowGenerateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
            >
              {t('quizPanel.generate')}
            </button>
          </div>
        </div>
      )}

      {compact && (
        <div className="p-3 border-b border-gray-200 flex gap-2">
          <button
            onClick={() => {
              setEditingQuiz(null);
              setShowManualModal(true);
            }}
            className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-md font-medium hover:bg-blue-50 text-sm"
          >
            {t('quizPanel.createManual')}
          </button>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 text-sm"
          >
            {t('quizPanel.generateBtn')}
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
      ) : quizSets.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="mt-2">{t('quizPanel.noQuizzesYet')}</p>
          <p className="text-sm">{t('quizPanel.generateToStart')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 flex-1 overflow-auto">
          {quizSets.map((quiz) => (
            <li key={quiz.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1 cursor-pointer" onClick={() => handleViewQuiz(quiz.id)}>
                <p className="font-medium text-gray-900">{quiz.title}</p>
                <p className="text-sm text-gray-500">
                  {quiz._count?.questions || quiz.questions?.length || 0} {t('quizPanel.questions')}
                  {quiz.focusTopic && ` - ${quiz.focusTopic}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewQuiz(quiz.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {t('common.start')}
                </button>
                <button
                  onClick={() => handleEditQuiz(quiz.id)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
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
