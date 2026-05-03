import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { Note } from '../../types';

export default function NotesScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      // Notes are scoped to a classroom on the backend — this fetches from
      // a first-available classroom or returns empty until a classroom is selected.
      const classroomsRes = await api.get<{ classrooms: { id: string }[] }>('/classrooms');
      const first = classroomsRes.data.classrooms[0];
      if (!first) { setNotes([]); return; }
      const { data } = await api.get<{ notes: Note[] }>(`/classrooms/${first.id}/notes`);
      setNotes(data.notes);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
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
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.textPrimary }}>Notes</Text>
      </View>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
            <Text style={{ fontSize: 16, color: tokens.textSecondary, textAlign: 'center' }}>
              No notes yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderWidth: 1,
              borderRadius: 10,
              padding: 16,
              marginBottom: 10,
              shadowColor: tokens.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.textPrimary, marginBottom: 4 }}>
              {item.title}
            </Text>
            {item.content && (
              <Text style={{ fontSize: 13, color: tokens.textSecondary }} numberOfLines={3}>
                {item.content}
              </Text>
            )}
            <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 8 }}>
              {item.type === 'audio' ? '🎙 Audio note' : '📄 Text note'} · {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
