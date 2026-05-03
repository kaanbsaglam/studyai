import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../types';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark',  label: '🌙 Dark' },
  { value: 'earth', label: '🌿 Earth' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { tokens, theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.pageBg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: tokens.textPrimary, marginBottom: 24 }}>Profile</Text>

      {/* User card */}
      <View
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.cardBorder,
          borderWidth: 1,
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
          shadowColor: tokens.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary }}>{user?.name}</Text>
        <Text style={{ fontSize: 14, color: tokens.textSecondary, marginTop: 2 }}>{user?.email}</Text>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: tokens.accentSoft,
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.accent, textTransform: 'capitalize' }}>
            {user?.tier} plan
          </Text>
        </View>
      </View>

      {/* Theme picker */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Theme
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
        {THEMES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTheme(t.value)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: theme === t.value ? tokens.accentSoft : tokens.cardBg,
              borderColor: theme === t.value ? tokens.accent : tokens.cardBorder,
              borderWidth: 1,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme === t.value ? tokens.accent : tokens.textSecondary }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sign out */}
      <Pressable
        onPress={logout}
        style={({ pressed }) => ({
          backgroundColor: tokens.btnBg,
          borderColor: tokens.btnBorder,
          borderWidth: 1,
          borderRadius: 10,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
