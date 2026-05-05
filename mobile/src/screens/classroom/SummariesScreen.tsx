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

type Props = NativeStackScreenProps<RootStackParamList, 'Summaries'>;
type Env<T> = { success: boolean; data: T };

interface Summary {
  id: string;
  title: string;
  focusTopic: string | null;
  length: 'short' | 'medium' | 'long';
  createdAt: string;
}

const LENGTH_COLOR: Record<string, string> = {
  short: '#a67c52',
  medium: '#8b5e34',
  long: '#5c3d1e',
};

export default function SummariesScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [summaries, setSummaries]   = useState<Summary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [navOpen, setNavOpen]       = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Env<{ summaries: Summary[] }>>(`/classrooms/${classroomId}/summaries`);
      setSummaries(res.data.data.summaries);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load summaries.');
    }
  }, [classroomId]);

  useEffect(() => { fetch().finally(() => setLoading(false)); }, [fetch]);

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

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
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Summaries</Text>
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
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 32, paddingHorizontal: 24 }}>{error}</Text>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No summaries yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('SummaryReader', { summaryId: item.id, summaryTitle: item.title })}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
            >
              <View style={{
                backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
                borderRadius: 10, padding: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary, marginBottom: 4 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.focusTopic && (
                      <Text style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 6 }} numberOfLines={1}>
                        Topic: {item.focusTopic}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{
                        backgroundColor: tokens.accentSoft, borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: LENGTH_COLOR[item.length] ?? tokens.accent, textTransform: 'capitalize' }}>
                          {item.length}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: tokens.textMuted }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <ClassroomNavDrawer
        classroomId={classroomId}
        classroomName={classroomName}
        activeKey="summaries"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
