import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { StudyStats } from '../../types';

export default function StudyScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats]     = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ stats: StudyStats }>('/study-stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.pageBg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.textPrimary, marginBottom: 24 }}>Study</Text>

      {/* Stats row */}
      {loading ? (
        <ActivityIndicator color={tokens.accent} style={{ marginVertical: 16 }} />
      ) : stats ? (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total minutes', value: stats.totalMinutes },
            { label: 'Sessions', value: stats.totalSessions },
            { label: 'Day streak', value: stats.streakDays },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                backgroundColor: tokens.cardBg,
                borderColor: tokens.cardBorder,
                borderWidth: 1,
                borderRadius: 10,
                padding: 14,
                alignItems: 'center',
                shadowColor: tokens.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.accent }}>{item.value}</Text>
              <Text style={{ fontSize: 11, color: tokens.textSecondary, marginTop: 4, textAlign: 'center' }}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Placeholder sections */}
      {['Flashcards', 'Quizzes', 'Summaries'].map((section) => (
        <View
          key={section}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
            borderWidth: 1,
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: tokens.textPrimary }}>{section}</Text>
          <Text style={{ fontSize: 13, color: tokens.textMuted, marginTop: 4 }}>Coming soon</Text>
        </View>
      ))}
    </ScrollView>
  );
}
