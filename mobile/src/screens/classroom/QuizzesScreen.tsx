import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { RootStackParamList } from '../../app/RootNavigator';
import ClassroomNavDrawer from '../../components/ClassroomNavDrawer';
import QuizSolveView from '../../components/QuizSolveView';
import { useStudyTracker } from '../../hooks/useStudyTracker';

type Props = NativeStackScreenProps<RootStackParamList, 'Quizzes'>;

type Env<T> = { success: boolean; data: T };

interface QuizSet {
  id: string;
  title: string;
  focusTopic?: string | null;
  createdAt: string;
  _count?: { questions: number };
  questionCount?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  position: number;
}

interface QuizSetDetail extends QuizSet {
  questions: QuizQuestion[];
}

export default function QuizzesScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  useStudyTracker(classroomId, 'QUIZ');

  const [sets, setSets]             = useState<QuizSet[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [navOpen, setNavOpen]       = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizSetDetail | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Env<{ quizSets: QuizSet[] }>>(
        `/classrooms/${classroomId}/quiz-sets`,
      );
      setSets(res.data.data.quizSets);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load quizzes.');
    }
  }, [classroomId]);

  useEffect(() => { fetch().finally(() => setLoading(false)); }, [fetch]);

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const loadQuiz = useCallback(async (quizId: string) => {
    try {
      setLoadingQuizId(quizId);
      const res = await api.get<Env<{ quizSet: QuizSetDetail }>>(`/quiz-sets/${quizId}`);
      setActiveQuiz(res.data.data.quizSet);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load quizzes.');
    } finally {
      setLoadingQuizId(null);
    }
  }, []);

  if (activeQuiz) {
    return (
      <QuizSolveView
        activeQuiz={activeQuiz}
        onClose={() => setActiveQuiz(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
      <View style={{
        paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          {({ pressed }) => (
            <Text style={{ fontSize: 28, lineHeight: 32, opacity: pressed ? 0.5 : 1, color: tokens.accent }}>‹</Text>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Quizzes</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{classroomName}</Text>
        </View>
        <Pressable onPress={() => setNavOpen(true)} hitSlop={8}>
          {({ pressed }) => (
            <View style={{ gap: 4, opacity: pressed ? 0.6 : 1, paddingLeft: 4 }}>
              <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
              <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
              <View style={{ width: 17, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : error ? (
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 32, paddingHorizontal: 24 }}>
          {error}
        </Text>
      ) : (
        <FlatList
          data={sets}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No quizzes yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const count = item._count?.questions ?? item.questionCount ?? 0;
            return (
              <Pressable
                onPress={() => loadQuiz(item.id)}
                disabled={!!loadingQuizId}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
              >
                <View style={{
                  backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
                  borderRadius: 10, padding: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 8,
                      backgroundColor: tokens.accentSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.accent }}>QZ</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!!item.focusTopic && (
                        <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 4 }} numberOfLines={1}>
                          Topic: {item.focusTopic}
                        </Text>
                      )}
                      <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {loadingQuizId === item.id ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <View style={{
                        backgroundColor: tokens.accentSoft, borderRadius: 8,
                        paddingHorizontal: 8, paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.accent }}>
                          {count} questions
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <ClassroomNavDrawer
        classroomId={classroomId}
        classroomName={classroomName}
        activeKey="quizzes"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
