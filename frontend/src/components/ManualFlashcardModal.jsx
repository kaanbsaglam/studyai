import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

/**
 * Modal for manually creating or editing a flashcard set.
 * 
 * Props:
 *  - classroomId: string (required for create)
 *  - existingSet: object | null (if provided, we are editing)
 *  - onClose: () => void
 *  - onSaved: (savedSet) => void
 */
export default function ManualFlashcardModal({ classroomId, existingSet, onClose, onSaved, compact }) {
  const { t } = useTranslation();
  const isEditing = !!existingSet;

  const [title, setTitle] = useState('');
  const [focusTopic, setFocusTopic] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingSet) {
      setTitle(existingSet.title || '');
      setFocusTopic(existingSet.focusTopic || '');
      setCards(
        existingSet.cards && existingSet.cards.length > 0
          ? existingSet.cards.map((c) => ({ id: c.id, front: c.front, back: c.back }))
          : [{ front: '', back: '' }]
      );
    }
  }, [existingSet]);

  const addCard = () => {
    setCards((prev) => [...prev, { front: '', back: '' }]);
  };

  const removeCard = (index) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCard = (index, field, value) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const moveCard = (index, direction) => {
    const newCards = [...cards];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCards.length) return;
    [newCards[index], newCards[targetIndex]] = [newCards[targetIndex], newCards[index]];
    setCards(newCards);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      setError(t('manualFlashcard.atLeastOneCard'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      let result;
      if (isEditing) {
        const response = await api.put(`/flashcard-sets/${existingSet.id}`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || null,
          cards: validCards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })),
        });
        result = response.data.data.flashcardSet;
      } else {
        const response = await api.post(`/classrooms/${classroomId}/flashcard-sets/manual`, {
          title: title.trim(),
          focusTopic: focusTopic.trim() || undefined,
          cards: validCards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })),
        });
        result = response.data.data.flashcardSet;
      }
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('manualFlashcard.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow'}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? t('manualFlashcard.editTitle') : t('manualFlashcard.createTitle')}
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
              {t('manualFlashcard.setTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('manualFlashcard.setTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Focus Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('manualFlashcard.focusTopic')}
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder={t('manualFlashcard.focusTopicPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('manualFlashcard.cards')} ({cards.length})
              </label>
              <button
                type="button"
                onClick={addCard}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + {t('manualFlashcard.addCard')}
              </button>
            </div>

            <div className="space-y-3">
              {cards.map((card, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {t('manualFlashcard.cardNumber', { number: index + 1 })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveCard(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title={t('manualFlashcard.moveUp')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCard(index, 1)}
                        disabled={index === cards.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title={t('manualFlashcard.moveDown')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCard(index)}
                        disabled={cards.length <= 1}
                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                        title={t('common.delete')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('manualFlashcard.front')}</label>
                      <textarea
                        value={card.front}
                        onChange={(e) => updateCard(index, 'front', e.target.value)}
                        placeholder={t('manualFlashcard.frontPlaceholder')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('manualFlashcard.back')}</label>
                      <textarea
                        value={card.back}
                        onChange={(e) => updateCard(index, 'back', e.target.value)}
                        placeholder={t('manualFlashcard.backPlaceholder')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
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
                t('manualFlashcard.createSet')
              )}
            </button>
          </div>
        </form>
    </div>
  );
}
