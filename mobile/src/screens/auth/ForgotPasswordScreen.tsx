import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import type { AuthStackParamList } from '../../app/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!email) { setError('Enter your email.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.pageBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top }}>
        <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 14, color: tokens.accent }}>← Back</Text>
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: '700', color: tokens.textPrimary, marginBottom: 8 }}>
          Reset password
        </Text>
        <Text style={{ fontSize: 15, color: tokens.textSecondary, marginBottom: 32 }}>
          We'll send a reset link to your email address.
        </Text>

        {sent ? (
          <Text style={{ fontSize: 15, color: tokens.accent }}>
            ✓ Check your inbox for reset instructions.
          </Text>
        ) : (
          <>
            <TextInput
              style={{
                backgroundColor: tokens.inputBg,
                borderColor: tokens.inputBorder,
                borderWidth: 1,
                borderRadius: 10,
                height: 44,
                paddingHorizontal: 16,
                fontSize: 15,
                color: tokens.textPrimary,
                marginBottom: 16,
              }}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={tokens.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!!error && (
              <Text style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: tokens.btnPrimaryBg,
                borderRadius: 10,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || loading ? 0.8 : 1,
              })}
            >
              {loading
                ? <ActivityIndicator color={tokens.btnPrimaryText} />
                : <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.btnPrimaryText }}>Send reset link</Text>
              }
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
