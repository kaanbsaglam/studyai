import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { RootStackParamList } from '../../app/RootNavigator';
import type { Document } from '../../types';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import { useStudyTracker } from '../../hooks/useStudyTracker';
import ClassroomNavDrawer from '../../components/ClassroomNavDrawer';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassroomDetail'>;
type Env<T> = { success: boolean; data: T };

interface ClassroomStats {
  totalSeconds: number;
  dailyData: { date: string; seconds: number }[];
}

interface ClassroomCounts {
  documents: number;
  flashcardSets: number;
  quizSets: number;
  summaries: number;
  notes: number;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.max(0, s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_COLOR: Record<string, string> = {
  READY: '#6f5b45',
  PROCESSING: '#a67c52',
  PENDING: '#a67c52',
  FAILED: '#ef4444',
};

export default function ClassroomDetailScreen({ route, navigation }: Props) {
  const { classroom } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats]           = useState<ClassroomStats | null>(null);
  const [counts, setCounts]         = useState<ClassroomCounts | null>(null);
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [tick, setTick]             = useState(0);
  const [navOpen, setNavOpen]       = useState(false);

  const statsFetchedAtRef = useRef(Date.now());
  const statsBaseRef      = useRef(0);

  useStudyTracker(classroom.id, 'DOCUMENT');

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const applyStats = (s: ClassroomStats) => {
    statsBaseRef.current      = s.totalSeconds;
    statsFetchedAtRef.current = Date.now();
    setStats(s);
  };

  const fetchAll = useCallback(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const [classroomRes, statsRes, docsRes] = await Promise.all([
        api.get<Env<{ classroom: { _count: ClassroomCounts } }>>(`/classrooms/${classroom.id}`),
        api.get<Env<ClassroomStats>>(`/classrooms/${classroom.id}/study-stats?days=84&tzOffset=${-tzOffset}`),
        api.get<Env<{ documents: Document[] }>>(`/classrooms/${classroom.id}/documents`),
      ]);
      setCounts(classroomRes.data.data.classroom._count);
      applyStats(statsRes.data.data);
      const sorted = [...docsRes.data.data.documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setDocuments(sorted.slice(0, 5));
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load.');
    }
  }, [classroom.id]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const tzOffset = new Date().getTimezoneOffset();
        const res = await api.get<Env<ClassroomStats>>(
          `/classrooms/${classroom.id}/study-stats?days=84&tzOffset=${-tzOffset}`,
        );
        applyStats(res.data.data);
      } catch { }
    }, 60_000);
    return () => clearInterval(id);
  }, [classroom.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const liveTotal = statsBaseRef.current + Math.floor((Date.now() - statsFetchedAtRef.current) / 1000);
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayBase = (stats?.dailyData ?? []).find(d => d.date === todayStr)?.seconds ?? 0;
  const liveToday = todayBase + Math.floor((Date.now() - statsFetchedAtRef.current) / 1000);
  void tick;

  const p = { classroomId: classroom.id, classroomName: classroom.name };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          {({ pressed }) => (
            <Text style={{ fontSize: 28, lineHeight: 32, opacity: pressed ? 0.5 : 1, color: tokens.accent }}>‹</Text>
          )}
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.textPrimary, flex: 1 }} numberOfLines={1}>
          {classroom.name}
        </Text>
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
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 32, paddingHorizontal: 24 }}>{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
        >
          {/* Study stats */}
          <View style={{ flexDirection: 'row', marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: tokens.accent }}>
                {formatSeconds(liveToday)}
              </Text>
              <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>Today</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: tokens.accent }}>
                {formatSeconds(liveTotal)}
              </Text>
              <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>Total</Text>
            </View>
          </View>

          {/* Heatmap */}
          <View style={{
            backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
            borderRadius: 12, padding: 14, marginBottom: 24,
            shadowColor: tokens.shadowColor, shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Activity
            </Text>
            <ActivityHeatmap dailyData={stats?.dailyData ?? []} weeks={12} />
          </View>

          {/* Material counts */}
          {counts && (
            <View style={{ flexDirection: 'row', marginBottom: 28 }}>
              {[
                { label: 'Documents',  count: counts.documents },
                { label: 'Flashcards', count: counts.flashcardSets },
                { label: 'Quizzes',    count: counts.quizSets },
                { label: 'Summaries',  count: counts.summaries },
                { label: 'Notes',      count: counts.notes },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: tokens.textPrimary }}>{item.count}</Text>
                  <Text style={{ fontSize: 10, color: tokens.textMuted, marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent documents */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Recent Documents
            </Text>
            <Pressable onPress={() => navigation.navigate('Documents', p)}>
              {({ pressed }) => (
                <View style={{
                  backgroundColor: tokens.btnPrimaryBg, borderRadius: 8,
                  paddingHorizontal: 12, height: 32, justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.btnPrimaryText }}>+ Upload</Text>
                </View>
              )}
            </Pressable>
          </View>

          {documents.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>📄</Text>
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No documents yet.</Text>
            </View>
          ) : (
            documents.map((doc, i) => (
              <View
                key={doc.id}
                style={{
                  backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
                  borderRadius: 10, padding: 14,
                  marginBottom: i < documents.length - 1 ? 8 : 0,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <Text style={{ fontSize: 22 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary }} numberOfLines={1}>
                    {doc.originalName}
                  </Text>
                  <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                    {formatBytes(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: tokens.accentSoft, borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: STATUS_COLOR[doc.status] ?? tokens.textMuted }}>
                    {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <ClassroomNavDrawer
        classroomId={classroom.id}
        classroomName={classroom.name}
        counts={counts}
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
