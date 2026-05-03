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
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { Classroom } from '../../types';

export default function ClassroomsScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data } = await api.get<{ classrooms: Classroom[] }>('/classrooms');
      setClassrooms(data.classrooms);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load classrooms.');
    }
  }, []);

  useEffect(() => {
    fetchClassrooms().finally(() => setLoading(false));
  }, [fetchClassrooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClassrooms();
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
      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.textPrimary }}>Classrooms</Text>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: tokens.btnPrimaryBg,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 36,
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.btnPrimaryText }}>+ New</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 32 }}>{error}</Text>
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📚</Text>
              <Text style={{ fontSize: 16, color: tokens.textSecondary, textAlign: 'center' }}>
                No classrooms yet.{'\n'}Tap "+ New" to create one.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: tokens.cardBg,
                borderColor: tokens.cardBorder,
                borderWidth: 1,
                borderRadius: 10,
                padding: 16,
                marginBottom: 10,
                opacity: pressed ? 0.85 : 1,
                shadowColor: tokens.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: tokens.textPrimary, marginBottom: 4 }}>
                {item.name}
              </Text>
              {item.description && (
                <Text style={{ fontSize: 13, color: tokens.textSecondary }} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
