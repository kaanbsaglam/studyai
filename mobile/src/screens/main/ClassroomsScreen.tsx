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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { Classroom, GlobalStudyStats } from '../../types';
import type { RootStackParamList } from '../../app/RootNavigator';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import CreateClassroomModal from '../../components/CreateClassroomModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Env<T> = { success: boolean; data: T };

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function ClassroomsScreen() {
  const navigation = useNavigation<Nav>();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [stats, setStats] = useState<GlobalStudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [classroomsRes, statsRes] = await Promise.all([
        api.get<Env<{ classrooms: Classroom[] }>>('/classrooms'),
        api.get<Env<GlobalStudyStats>>('/study-stats'),
      ]);
      setClassrooms(classroomsRes.data.data.classrooms);
      setStats(statsRes.data.data);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load.');
    }
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Refresh stats every 60 s while screen is mounted
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await api.get<Env<GlobalStudyStats>>('/study-stats');
        setStats(res.data.data);
      } catch { /* silently ignore */ }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Also refresh stats immediately whenever this screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      api.get<Env<GlobalStudyStats>>('/study-stats')
        .then(res => setStats(res.data.data))
        .catch(() => {});
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleCreate = async (name: string, description: string) => {
    const { data } = await api.post<Env<{ classroom: Classroom }>>('/classrooms', { name, description: description || undefined });
    setClassrooms(prev => [data.data.classroom, ...prev]);
    setShowCreate(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.pageBg }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.textPrimary }}>My Classrooms</Text>
        <Pressable onPress={() => setShowCreate(true)}>
          {({ pressed }) => (
            <View style={{
              backgroundColor: tokens.btnPrimaryBg,
              borderRadius: 10,
              paddingHorizontal: 14,
              height: 36,
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.btnPrimaryText }}>+ New</Text>
            </View>
          )}
        </Pressable>
      </View>

      {error ? (
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 32, paddingHorizontal: 24 }}>{error}</Text>
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListHeaderComponent={stats ? <StatsBar stats={stats} tokens={tokens} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📚</Text>
              <Text style={{ fontSize: 16, color: tokens.textSecondary, textAlign: 'center' }}>
                No classrooms yet.{'\n'}Tap "+ New" to create one.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClassroomCard
              classroom={item}
              tokens={tokens}
              onPress={() => navigation.navigate('ClassroomDetail', { classroom: item })}
            />
          )}
        />
      )}

      <CreateClassroomModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

function StatsBar({ stats, tokens }: { stats: GlobalStudyStats; tokens: any }) {
  return (
    <View style={{ marginBottom: 20, marginTop: 4 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <StatPill label="Today" value={formatSeconds(stats.todaySeconds)} tokens={tokens} />
        <StatPill label="This week" value={formatSeconds(stats.weekSeconds)} tokens={tokens} />
        <StatPill label="Streak" value={`${stats.streak}d`} tokens={tokens} />
      </View>
      <View style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        shadowColor: tokens.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Activity
        </Text>
        <ActivityHeatmap dailyData={stats.dailyData} />
      </View>
    </View>
  );
}

function StatPill({ label, value, tokens }: { label: string; value: string; tokens: any }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: tokens.cardBg,
      borderColor: tokens.cardBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      shadowColor: tokens.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.accent }}>{value}</Text>
      <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ClassroomCard({ classroom, tokens, onPress }: { classroom: Classroom; tokens: any; onPress: () => void }) {
  const docCount = classroom._count?.documents ?? 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: 12 })}>
      <View style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        shadowColor: tokens.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
      }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.textPrimary, flex: 1, marginRight: 8 }} numberOfLines={1}>
            {classroom.name}
          </Text>
          <View style={{
            backgroundColor: tokens.accentSoft,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.accent }}>
              {docCount} {docCount === 1 ? 'doc' : 'docs'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {classroom.description ? (
          <Text style={{ fontSize: 13, color: tokens.textSecondary, lineHeight: 18 }} numberOfLines={2}>
            {classroom.description}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: tokens.textMuted, fontStyle: 'italic' }}>No description</Text>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 }}>
          <Text style={{ fontSize: 11, color: tokens.textMuted }}>
            Updated {new Date(classroom.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
