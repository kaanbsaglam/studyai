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

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;
type Env<T> = { success: boolean; data: T };

interface Note {
  id: string;
  title: string;
  content: string;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
  document: { id: string; originalName: string } | null;
}

export default function NotesScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [notes, setNotes]           = useState<Note[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [navOpen, setNavOpen]       = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Env<{ notes: Note[] }>>(`/classrooms/${classroomId}/notes`);
      setNotes(res.data.data.notes);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load notes.');
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Notes</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{classroomName}</Text>
        </View>
        <Pressable onPress={() => {}}>
          {({ pressed }) => (
            <View style={{
              backgroundColor: tokens.btnPrimaryBg, borderRadius: 8,
              paddingHorizontal: 12, height: 32, justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.btnPrimaryText }}>+ New</Text>
            </View>
          )}
        </Pressable>
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
          data={notes}
          keyExtractor={n => n.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🗒️</Text>
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No notes yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAudio = !!item.mimeType;
            return (
              <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}>
                <View style={{
                  backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
                  borderRadius: 10, padding: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Text style={{ fontSize: 20 }}>{isAudio ? '🎙️' : '📝'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary, flex: 1 }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={{
                      backgroundColor: tokens.accentSoft, borderRadius: 6,
                      paddingHorizontal: 7, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.accent }}>
                        {isAudio ? 'Audio' : 'Text'}
                      </Text>
                    </View>
                  </View>

                  {!isAudio && !!item.content && (
                    <Text style={{ fontSize: 13, color: tokens.textSecondary, lineHeight: 18 }} numberOfLines={3}>
                      {item.content}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: tokens.textMuted }}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                    {item.document && (
                      <>
                        <Text style={{ fontSize: 11, color: tokens.textMuted }}>·</Text>
                        <Text style={{ fontSize: 11, color: tokens.textMuted }} numberOfLines={1}>
                          {item.document.originalName}
                        </Text>
                      </>
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
        activeKey="notes"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
