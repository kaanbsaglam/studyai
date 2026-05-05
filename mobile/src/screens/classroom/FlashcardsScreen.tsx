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
import FlashcardStudyView from '../../components/FlashcardStudyView';
import { useStudyTracker } from '../../hooks/useStudyTracker';

type Props = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

type Env<T> = { success: boolean; data: T };

interface FlashcardSet {
  id: string;
  title: string;
  focusTopic?: string | null;
  createdAt: string;
  _count?: { cards: number };
  cardCount?: number;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  position: number;
}

interface FlashcardSetDetail extends FlashcardSet {
  cards: Flashcard[];
}

export default function FlashcardsScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  useStudyTracker(classroomId, 'FLASHCARDS');

  const [sets, setSets]             = useState<FlashcardSet[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [navOpen, setNavOpen]       = useState(false);
  const [activeSet, setActiveSet]   = useState<FlashcardSetDetail | null>(null);
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Env<{ flashcardSets: FlashcardSet[] }>>(
        `/classrooms/${classroomId}/flashcard-sets`,
      );
      setSets(res.data.data.flashcardSets);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load flashcards.');
    }
  }, [classroomId]);

  useEffect(() => { fetch().finally(() => setLoading(false)); }, [fetch]);

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const loadSet = useCallback(async (setId: string) => {
    try {
      setLoadingSetId(setId);
      const res = await api.get<Env<{ flashcardSet: FlashcardSetDetail }>>(`/flashcard-sets/${setId}`);
      setActiveSet(res.data.data.flashcardSet);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load flashcards.');
    } finally {
      setLoadingSetId(null);
    }
  }, []);

  if (activeSet) {
    return (
      <FlashcardStudyView
        activeSet={activeSet}
        onClose={() => setActiveSet(null)}
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Flashcards</Text>
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
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No flashcards yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const count = item._count?.cards ?? item.cardCount ?? 0;
            return (
              <Pressable
                onPress={() => loadSet(item.id)}
                disabled={!!loadingSetId}
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
                      <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.accent }}>FC</Text>
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
                    {loadingSetId === item.id ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <View style={{
                        backgroundColor: tokens.accentSoft, borderRadius: 8,
                        paddingHorizontal: 8, paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.accent }}>
                          {count} cards
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
        activeKey="flashcards"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
