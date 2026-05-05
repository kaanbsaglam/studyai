import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';

type Flashcard = {
  id: string;
  front: string;
  back: string;
  position: number;
};

type FlashcardSet = {
  id: string;
  title: string;
  focusTopic?: string | null;
  cards: Flashcard[];
};

type Progress = {
  flashcardId: string;
  correct: number;
  wrong: number;
  confidence: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt?: string | null;
};

type SessionResult = { correct: boolean };

type Props = {
  activeSet: FlashcardSet;
  onClose: () => void;
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sortCardsForReview(cards: Flashcard[], progressMap: Record<string, Progress>): Flashcard[] {
  const now = new Date();
  return [...cards].sort((a, b) => {
    const pa = progressMap[a.id];
    const pb = progressMap[b.id];

    if (!pa && !pb) return a.position - b.position;
    if (!pa) return -1;
    if (!pb) return 1;

    const aDue = !pa.nextReviewAt || new Date(pa.nextReviewAt) <= now;
    const bDue = !pb.nextReviewAt || new Date(pb.nextReviewAt) <= now;

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    if (aDue && bDue) return (pa.easeFactor ?? 2.5) - (pb.easeFactor ?? 2.5);
    return new Date(pa.nextReviewAt ?? 0).getTime() - new Date(pb.nextReviewAt ?? 0).getTime();
  });
}

export default function FlashcardStudyView({ activeSet, onClose }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [sessionResults, setSessionResults] = useState<Record<string, SessionResult>>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [initialOrder, setInitialOrder] = useState<Flashcard[]>([]);

  const loadProgress = useCallback(async () => {
    try {
      setLoadingProgress(true);
      const res = await api.get<{ success: boolean; data: { progress: Progress[] } }>(
        `/flashcard-sets/${activeSet.id}/progress`,
      );
      const map: Record<string, Progress> = {};
      for (const p of res.data.data.progress) {
        map[p.flashcardId] = p;
      }
      setProgressMap(map);
    } catch {
      // Non-critical
    } finally {
      setLoadingProgress(false);
    }
  }, [activeSet.id]);

  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setShuffledCards([]);
    setShowSummary(false);
    setSessionResults({});
    setInitialOrder([]);
    loadProgress();
  }, [activeSet.id, loadProgress]);

  useEffect(() => {
    if (initialOrder.length > 0 || activeSet.cards.length === 0) return;
    if (Object.keys(progressMap).length > 0) {
      setInitialOrder(sortCardsForReview(activeSet.cards, progressMap));
    } else {
      setInitialOrder([...activeSet.cards].sort((a, b) => a.position - b.position));
    }
  }, [activeSet.cards, progressMap, initialOrder.length]);

  const displayCards = useMemo(() => {
    if (isShuffled) return shuffledCards;
    return initialOrder.length > 0 ? initialOrder : activeSet.cards;
  }, [isShuffled, shuffledCards, initialOrder, activeSet.cards]);

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
  };

  const goToCard = (idx: number) => {
    setCurrentCardIndex(idx);
    setIsFlipped(false);
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
  };

  const handleAnswer = async (correct: boolean) => {
    if (!currentCard || savingProgress) return;
    setSavingProgress(true);

    const cardId = currentCard.id;
    setSessionResults((prev) => ({
      ...prev,
      [cardId]: { correct },
    }));

    try {
      const res = await api.post<{ success: boolean; data: { progress: Progress } }>(
        `/flashcard-sets/${activeSet.id}/progress`,
        {
          flashcardId: cardId,
          correct,
          confidence: correct ? 4 : 1,
        },
      );
      setProgressMap((prev) => ({ ...prev, [cardId]: res.data.data.progress }));
    } catch {
      // Non-critical
    } finally {
      setSavingProgress(false);
      setTimeout(() => nextCard(), 250);
    }
  };

  const resetProgress = async () => {
    try {
      await api.delete(`/flashcard-sets/${activeSet.id}/progress`);
      setProgressMap({});
      setSessionResults({});
      setInitialOrder([...activeSet.cards].sort((a, b) => a.position - b.position));
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
  };

  const stats = useMemo(() => {
    const total = displayCards.length;
    let mastered = 0;
    let learning = 0;
    let newCards = 0;
    const now = new Date();

    for (const card of displayCards) {
      const p = progressMap[card.id];
      if (!p) {
        newCards += 1;
      } else if (p.repetitions >= 3 && p.nextReviewAt && new Date(p.nextReviewAt) > now) {
        mastered += 1;
      } else {
        learning += 1;
      }
    }

    const sessionCorrect = Object.values(sessionResults).filter((r) => r.correct).length;
    const sessionWrong = Object.values(sessionResults).filter((r) => !r.correct).length;
    const sessionTotal = sessionCorrect + sessionWrong;

    return { total, mastered, learning, newCards, sessionCorrect, sessionWrong, sessionTotal };
  }, [displayCards, progressMap, sessionResults]);

  if (loadingProgress && activeSet.cards.length > 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (showSummary) {
    const accuracy = stats.sessionTotal > 0
      ? Math.round((stats.sessionCorrect / stats.sessionTotal) * 100)
      : 0;

    return (
      <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
        <View style={{
          paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <Pressable onPress={onClose} hitSlop={8}>
            {({ pressed }) => (
              <Text style={{ fontSize: 22, opacity: pressed ? 0.5 : 1, color: tokens.accent }}>{'<'}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Session Complete</Text>
            <Text style={{ fontSize: 12, color: tokens.textMuted }}>{activeSet.title}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          <View style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.textPrimary, marginBottom: 8 }}>
              Accuracy
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: tokens.accent }}>
              {accuracy}%
            </Text>
            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 6 }}>
              Correct {stats.sessionCorrect} · Wrong {stats.sessionWrong}
            </Text>
          </View>

          <View style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 18,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary, marginBottom: 10 }}>
              Overall Progress
            </Text>
            <View style={{ height: 8, backgroundColor: tokens.btnBgPressed, borderRadius: 6, overflow: 'hidden' }}>
              {stats.total > 0 && (
                <View style={{ flexDirection: 'row', height: 8 }}>
                  {stats.mastered > 0 && (
                    <View style={{ backgroundColor: '#22c55e', width: `${(stats.mastered / stats.total) * 100}%` }} />
                  )}
                  {stats.learning > 0 && (
                    <View style={{ backgroundColor: '#f59e0b', width: `${(stats.learning / stats.total) * 100}%` }} />
                  )}
                  {stats.newCards > 0 && (
                    <View style={{ backgroundColor: '#94a3b8', width: `${(stats.newCards / stats.total) * 100}%` }} />
                  )}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontSize: 11, color: tokens.textMuted }}>Mastered {stats.mastered}</Text>
              <Text style={{ fontSize: 11, color: tokens.textMuted }}>Learning {stats.learning}</Text>
              <Text style={{ fontSize: 11, color: tokens.textMuted }}>New {stats.newCards}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={restartSession}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: tokens.btnPrimaryBg,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: tokens.btnPrimaryText, fontWeight: '600' }}>Study Again</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: tokens.cardBg,
                borderColor: tokens.cardBorder,
                borderWidth: 1,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>Back to Sets</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: tokens.textMuted }}>No cards found.</Text>
      </View>
    );
  }

  const cardProgress = progressMap[currentCard.id];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
      <View style={{
        paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Pressable onPress={onClose} hitSlop={8}>
          {({ pressed }) => (
            <Text style={{ fontSize: 22, opacity: pressed ? 0.5 : 1, color: tokens.accent }}>{'<'}</Text>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.textPrimary }} numberOfLines={1}>
            {activeSet.title}
          </Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>
            Card {currentCardIndex + 1} of {displayCards.length}{isShuffled ? ' · Shuffled' : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={toggleShuffle} hitSlop={6}>
            {({ pressed }) => (
              <Text style={{ fontSize: 12, color: isShuffled ? tokens.accent : tokens.textMuted, opacity: pressed ? 0.6 : 1 }}>
                Shuffle
              </Text>
            )}
          </Pressable>
          <Pressable onPress={resetProgress} hitSlop={6}>
            {({ pressed }) => (
              <Text style={{ fontSize: 12, color: tokens.textMuted, opacity: pressed ? 0.6 : 1 }}>
                Reset
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ height: 6, backgroundColor: tokens.btnBgPressed, borderRadius: 6, overflow: 'hidden' }}>
          {stats.total > 0 && (
            <View style={{ flexDirection: 'row', height: 6 }}>
              {stats.mastered > 0 && (
                <View style={{ backgroundColor: '#22c55e', width: `${(stats.mastered / stats.total) * 100}%` }} />
              )}
              {stats.learning > 0 && (
                <View style={{ backgroundColor: '#f59e0b', width: `${(stats.learning / stats.total) * 100}%` }} />
              )}
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 10, color: tokens.textMuted }}>Mastered {stats.mastered}</Text>
          <Text style={{ fontSize: 10, color: tokens.textMuted }}>Learning {stats.learning}</Text>
          <Text style={{ fontSize: 10, color: tokens.textMuted }}>New {stats.newCards}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        <Pressable
          onPress={flipCard}
          disabled={savingProgress}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View style={{
            backgroundColor: tokens.cardBg,
            borderColor: isFlipped ? tokens.accent : tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 16,
            padding: 18,
            minHeight: 220,
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 11, color: tokens.textMuted, textAlign: 'center', marginBottom: 10 }}>
              {isFlipped ? 'Answer' : 'Question'}
            </Text>
            <Text style={{ fontSize: 16, color: tokens.textPrimary, textAlign: 'center', lineHeight: 22 }}>
              {isFlipped ? currentCard.back : currentCard.front}
            </Text>
            {cardProgress && !isFlipped && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>Correct {cardProgress.correct}</Text>
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>Wrong {cardProgress.wrong}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Text style={{ fontSize: 11, color: tokens.textMuted, textAlign: 'center', marginTop: 10 }}>
          Tap the card to {isFlipped ? 'hide' : 'reveal'} the answer
        </Text>

        {isFlipped && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={() => handleAnswer(false)}
              disabled={savingProgress}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: '#fee2e2',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#b91c1c', fontWeight: '600' }}>Wrong</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(true)}
              disabled={savingProgress}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: '#dcfce7',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#166534', fontWeight: '600' }}>Correct</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <Pressable
            onPress={prevCard}
            disabled={currentCardIndex === 0}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: tokens.btnBg,
              borderColor: tokens.btnBorder,
              borderWidth: 1.5,
              alignItems: 'center',
              opacity: pressed ? 0.8 : currentCardIndex === 0 ? 0.35 : 1,
            })}
          >
            <Text style={{ color: tokens.btnText, fontWeight: '600', fontSize: 15 }}>Previous</Text>
          </Pressable>
          <Pressable
            onPress={nextCard}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: tokens.btnPrimaryBg,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: tokens.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>
              {currentCardIndex === displayCards.length - 1 ? 'Finish' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
