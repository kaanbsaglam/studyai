import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

/**
 * Modal for manually creating or editing a quiz set.
 *
 * Props:
 *  - classroomId: string (required for create)
 *  - existingQuiz: object | null (if provided, we are editing)
 *  - onClose: () => void
 *  - onSaved: (savedQuiz) => void
 */
export default function ManualQuizModal({ classroomId, existingQuiz, onClose, onSaved, compact }) {
  const { t } = useTranslation();
  const isEditing = !!existingQuiz;

  const [title, setTitle] = useState('');
  const [focusTopic, setFocusTopic] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', correctAnswer: '', wrongAnswers: ['', '', ''] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.title || '');
      setFocusTopic(existingQuiz.focusTopic || '');
      setQuestions(
        existingQuiz.questions && existingQuiz.questions.length > 0
          ? existingQuiz.questions.map((q) => ({
              id: q.id,
              question: q.question,
              correctAnswer: q.correctAnswer,
              wrongAnswers: [...(q.wrongAnswers || ['', '', ''])],
            }))
          : [{ question: '', correctAnswer: '', wrongAnswers: ['', '', ''] }]
      );
    }
  }, [existingQuiz]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: '', correctAnswer: '', wrongAnswers: ['', '', ''] },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateWrongAnswer = (qIndex, wIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newWrong = [...q.wrongAnswers];
        newWrong[wIndex] = value;
        return { ...q, wrongAnswers: newWrong };
      })
    );
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...questions];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validQuestions = questions.filter(
      (q) =>
        q.question.trim() &&
        q.correctAnswer.trim() &&
        q.wrongAnswers.every((w) => w.trim())
    );

    if (validQuestions.length === 0) {
      setError(t('manualQuiz.atLeastOneQuestion'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      let result;
      if (isEditing) {
        const response = await api.put(`/quiz-sets/${existingQuiz.id}`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || null,
          questions: validQuestions.map((q) => ({
            question: q.question.trim(),
            correctAnswer: q.correctAnswer.trim(),
            wrongAnswers: q.wrongAnswers.map((w) => w.trim()),
          })),
        });
        result = response.data.data.quizSet;
      } else {
        const response = await api.post(`/classrooms/${classroomId}/quiz-sets/manual`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || undefined,
          questions: validQuestions.map((q) => ({
            question: q.question.trim(),
            correctAnswer: q.correctAnswer.trim(),
            wrongAnswers: q.wrongAnswers.map((w) => w.trim()),
          })),
        });
        result = response.data.data.quizSet;
      }
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('manualQuiz.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? t('manualQuiz.editTitle') : t('manualQuiz.createTitle')}
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
              {t('manualQuiz.quizTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('manualQuiz.quizTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Focus Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualQuiz.focusTopic')}
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder={t('manualQuiz.focusTopicPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('manualQuiz.questions')} ({questions.length})
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + {t('manualQuiz.addQuestion')}
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500">
                      {t('manualQuiz.questionNumber', { number: qIndex + 1 })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIndex, -1)}
                        disabled={qIndex === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIndex, 1)}
                        disabled={qIndex === questions.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        disabled={questions.length <= 1}
                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">{t('manualQuiz.questionText')}</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder={t('manualQuiz.questionPlaceholder')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Correct answer */}
                  <div className="mb-3">
                    <label className="block text-xs text-green-600 mb-1 font-medium">
                      {t('manualQuiz.correctAnswer')}
                    </label>
                    <input
                      type="text"
                      value={q.correctAnswer}
                      onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                      placeholder={t('manualQuiz.correctAnswerPlaceholder')}
                      className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm bg-green-50"
                    />
                  </div>

                  {/* Wrong answers */}
                  <div>
                    <label className="block text-xs text-red-500 mb-1 font-medium">
                      {t('manualQuiz.wrongAnswers')}
                    </label>
                    <div className="space-y-2">
                      {q.wrongAnswers.map((wrong, wIndex) => (
                        <input
                          key={wIndex}
                          type="text"
                          value={wrong}
                          onChange={(e) => updateWrongAnswer(qIndex, wIndex, e.target.value)}
                          placeholder={`${t('manualQuiz.wrongAnswer')} ${wIndex + 1}`}
                          className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-red-400 focus:border-red-400 text-sm bg-red-50"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={saving || !title.trim()}
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
                t('manualQuiz.createQuiz')
              )}
            </button>
          </div>
        </form>
    </div>
  );
}
