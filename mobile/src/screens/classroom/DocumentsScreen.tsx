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

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>;
type Env<T> = { success: boolean; data: T };

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  READY: 'Ready',
  PROCESSING: 'Processing',
  PENDING: 'Pending',
  FAILED: 'Failed',
};
const STATUS_COLOR: Record<string, string> = {
  READY: '#6f5b45',
  PROCESSING: '#a67c52',
  PENDING: '#a67c52',
  FAILED: '#ef4444',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [navOpen, setNavOpen]     = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Env<{ documents: Document[] }>>(`/classrooms/${classroomId}/documents`);
      setDocuments(res.data.data.documents);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load documents.');
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>Documents</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{classroomName}</Text>
        </View>
        <Pressable onPress={() => {}}>
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
          data={documents}
          keyExtractor={d => d.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📄</Text>
              <Text style={{ fontSize: 15, color: tokens.textSecondary }}>No documents yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
              borderRadius: 10, padding: 14, marginBottom: 8,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <Text style={{ fontSize: 24 }}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary }} numberOfLines={1}>
                  {item.originalName}
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                  {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.status === 'FAILED' && item.errorMessage && (
                  <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }} numberOfLines={1}>
                    {item.errorMessage}
                  </Text>
                )}
              </View>
              <View style={{
                backgroundColor: tokens.accentSoft, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: STATUS_COLOR[item.status] ?? tokens.textMuted }}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <ClassroomNavDrawer
        classroomId={classroomId}
        classroomName={classroomName}
        activeKey="documents"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}
