import React, { useEffect, useMemo, useState } from 'react';
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

type QuizQuestion = {
  id: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  position: number;
};

type QuizSet = {
  id: string;
  title: string;
  focusTopic?: string | null;
  questions: QuizQuestion[];
};

type Attempt = {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
};

type Props = {
  activeQuiz: QuizSet;
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

export default function QuizSolveView({ activeQuiz, onClose }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoadingAttempts(true);
        const res = await api.get<{ success: boolean; data: { attempts: Attempt[] } }>(
          `/quiz-sets/${activeQuiz.id}/attempts`,
        );
        setAttempts(res.data.data.attempts);
      } catch {
        // Non-critical
      } finally {
        setLoadingAttempts(false);
      }
    };

    fetchAttempts();
  }, [activeQuiz.id]);

  useEffect(() => {
    const question = activeQuiz.questions[currentQuestionIndex];
    if (!question) return;
    const allAnswers = [question.correctAnswer, ...question.wrongAnswers];
    setShuffledAnswers(shuffleArray(allAnswers));
  }, [activeQuiz.questions, currentQuestionIndex]);

  const currentQuestion = activeQuiz.questions[currentQuestionIndex];

  const percentage = useMemo(() => {
    if (activeQuiz.questions.length === 0) return 0;
    return Math.round((score / activeQuiz.questions.length) * 100);
  }, [score, activeQuiz.questions.length]);

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || showResult) return;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) setScore((prev) => prev + 1);
    setShowResult(true);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      return;
    }

    setQuizCompleted(true);
    setSavingAttempt(true);
    try {
      await api.post(`/quiz-sets/${activeQuiz.id}/attempts`, {
        score,
        totalQuestions: activeQuiz.questions.length,
      });
      const res = await api.get<{ success: boolean; data: { attempts: Attempt[] } }>(
        `/quiz-sets/${activeQuiz.id}/attempts`,
      );
      setAttempts(res.data.data.attempts);
    } catch {
      // Non-critical
    } finally {
      setSavingAttempt(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
  };

  if (!currentQuestion) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: tokens.textMuted }}>No questions found.</Text>
      </View>
    );
  }

  if (quizCompleted) {
    const gradeText = percentage >= 90
      ? 'Excellent'
      : percentage >= 70
      ? 'Good job'
      : percentage >= 50
      ? 'Keep practicing'
      : 'Needs work';

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
            <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Quiz Complete</Text>
            <Text style={{ fontSize: 12, color: tokens.textMuted }}>{activeQuiz.title}</Text>
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
            <Text style={{ fontSize: 24, fontWeight: '700', color: tokens.accent }}>
              {percentage}%
            </Text>
            <Text style={{ fontSize: 14, color: tokens.textPrimary, marginTop: 6 }}>
              {gradeText}
            </Text>
            <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 6 }}>
              Score {score} / {activeQuiz.questions.length}
            </Text>
            {savingAttempt && (
              <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>
                Saving attempt...
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
            <Pressable
              onPress={handleRestartQuiz}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: tokens.btnPrimaryBg,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: tokens.btnPrimaryText, fontWeight: '600' }}>Try Again</Text>
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
              <Text style={{ color: tokens.textPrimary, fontWeight: '600' }}>Back to List</Text>
            </Pressable>
          </View>

          <View style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 16,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.textPrimary, marginBottom: 10 }}>
              Recent Attempts
            </Text>
            {loadingAttempts ? (
              <ActivityIndicator color={tokens.accent} />
            ) : attempts.length === 0 ? (
              <Text style={{ fontSize: 12, color: tokens.textMuted }}>No attempts yet.</Text>
            ) : (
              attempts.slice(0, 5).map((attempt) => {
                const attemptPct = Math.round((attempt.score / attempt.totalQuestions) * 100);
                return (
                  <View
                    key={attempt.id}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: tokens.textPrimary }}>
                      {attempt.score}/{attempt.totalQuestions} ({attemptPct}%)
                    </Text>
                    <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

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
            {activeQuiz.title}
          </Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>
            Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
          </Text>
        </View>
      </View>

      <View style={{ height: 6, backgroundColor: tokens.btnBgPressed }}>
        <View
          style={{
            height: 6,
            backgroundColor: tokens.accent,
            width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`,
          }}
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            flexGrow: 1,
          }}
        >
          <View style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 14,
            padding: 18,
            marginBottom: 18,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: tokens.textPrimary, lineHeight: 22 }}>
              {currentQuestion.question}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {shuffledAnswers.map((answer, idx) => {
            const isSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correctAnswer;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            let bg = tokens.cardBg;
            let border = tokens.cardBorder;
            let textColor = tokens.textPrimary;

            if (showCorrect) {
              bg = '#dcfce7';
              border = '#22c55e';
              textColor = '#166534';
            } else if (showWrong) {
              bg = '#fee2e2';
              border = '#ef4444';
              textColor = '#b91c1c';
            } else if (isSelected) {
              bg = tokens.accentSoft;
              border = tokens.accent;
              textColor = tokens.textPrimary;
            }

              const label = String.fromCharCode(65 + idx);

              return (
                <Pressable
                  key={answer}
                  onPress={() => !showResult && setSelectedAnswer(answer)}
                  disabled={showResult}
                  style={({ pressed }) => ({
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 2,
                    borderRadius: 18,
                    paddingVertical: 24,
                    paddingHorizontal: 18,
                    marginBottom: 18,
                    minHeight: 96,
                    width: '100%',
                    shadowColor: tokens.shadowColor,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    elevation: 2,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: tokens.btnBgPressed,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: border,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>{label}</Text>
                    </View>
                    <Text style={{ color: textColor, fontSize: 17, flex: 1 }}>{answer}</Text>
                  </View>
                </Pressable>
              );
          })}
          </View>
        </ScrollView>

        <View style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: tokens.cardBorder,
          backgroundColor: tokens.pageBg,
          flexDirection: 'column',
          gap: 10,
        }}>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>
            Score {score} / {currentQuestionIndex + (showResult ? 1 : 0)}
          </Text>
          {!showResult ? (
            <Pressable
              onPress={handleSubmitAnswer}
              disabled={!selectedAnswer}
              style={({ pressed }) => ({
                backgroundColor: !selectedAnswer ? tokens.btnBgPressed : tokens.btnPrimaryBg,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                width: '100%',
                borderWidth: 1.5,
                borderColor: !selectedAnswer ? tokens.btnBorder : 'transparent',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{
                color: !selectedAnswer ? tokens.textMuted : tokens.btnPrimaryText,
                fontWeight: '700',
                fontSize: 16,
              }}>Submit</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleNextQuestion}
              style={({ pressed }) => ({
                backgroundColor: tokens.btnPrimaryBg,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                width: '100%',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: tokens.btnPrimaryText, fontWeight: '700', fontSize: 16 }}>
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next' : 'See Results'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
