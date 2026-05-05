import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { RootStackParamList } from '../../app/RootNavigator';
import MarkdownRenderer from '../../components/MarkdownRenderer';

type Props = NativeStackScreenProps<RootStackParamList, 'SummaryReader'>;
type Env<T> = { success: boolean; data: T };

interface SummaryDetail {
  id: string;
  title: string;
  focusTopic: string | null;
  content: string;
  length: 'short' | 'medium' | 'long';
  createdAt: string;
  classroom: { id: string; name: string };
}

const LENGTH_COLOR: Record<string, string> = {
  short: '#a67c52',
  medium: '#8b5e34',
  long: '#5c3d1e',
};

export default function SummaryReaderScreen({ route, navigation }: Props) {
  const { summaryId, summaryTitle } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<SummaryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Env<{ summary: SummaryDetail }>>(`/summaries/${summaryId}`);
      setSummary(res.data.data.summary);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { load(); }, [load]);

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.textPrimary }} numberOfLines={1}>
            {summaryTitle}
          </Text>
          {summary && (
            <Text style={{ fontSize: 12, color: tokens.textMuted }}>
              {summary.classroom.name} · {new Date(summary.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 15, color: '#ef4444', textAlign: 'center' }}>{error}</Text>
          <Pressable
            onPress={load}
            style={({ pressed }) => ({
              marginTop: 16, backgroundColor: tokens.btnPrimaryBg, borderRadius: 10,
              paddingVertical: 10, paddingHorizontal: 20, opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: tokens.btnPrimaryText, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : summary ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
          {/* Metadata card */}
          <View style={{
            backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
            borderRadius: 12, padding: 14, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <View style={{ backgroundColor: tokens.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: LENGTH_COLOR[summary.length] ?? tokens.accent, textTransform: 'capitalize' }}>
                  {summary.length}
                </Text>
              </View>
              {summary.focusTopic && (
                <View style={{ backgroundColor: tokens.btnBgPressed, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: tokens.textSecondary }}>{summary.focusTopic}</Text>
                </View>
              )}
              <Text style={{ fontSize: 11, color: tokens.textMuted }}>
                {new Date(summary.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Markdown content */}
          <View style={{
            backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
            borderRadius: 12, padding: 16,
          }}>
            <MarkdownRenderer content={summary.content} noScroll />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
