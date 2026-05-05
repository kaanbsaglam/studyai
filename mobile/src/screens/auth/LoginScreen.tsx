import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { AuthStackParamList } from '../../app/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.pageBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <Text style={{ fontFamily: 'System', fontSize: 28, fontWeight: '700', color: tokens.accent, marginBottom: 8 }}>
          StudyAI
        </Text>
        <Text style={{ fontSize: 16, color: tokens.textSecondary, marginBottom: 40 }}>
          Sign in to your account
        </Text>

        {/* Email */}
        <Text style={{ fontSize: 13, fontWeight: '500', color: tokens.textSecondary, marginBottom: 6 }}>
          Email
        </Text>
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

        {/* Password */}
        <Text style={{ fontSize: 13, fontWeight: '500', color: tokens.textSecondary, marginBottom: 6 }}>
          Password
        </Text>
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
            marginBottom: 8,
          }}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={tokens.textMuted}
          secureTextEntry
        />

        {/* Forgot password */}
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: tokens.accent }}>Forgot password?</Text>
        </Pressable>

        {/* Error */}
        {!!error && (
          <Text style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</Text>
        )}

        {/* Primary button */}
        <Pressable onPress={handleLogin} disabled={loading} style={{ marginBottom: 20 }}>
          {({ pressed }) => (
            <View
              style={{
                backgroundColor: tokens.btnPrimaryBg,
                borderRadius: 10,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed || loading ? 0.8 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color={tokens.btnPrimaryText} />
                : <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.btnPrimaryText }}>Sign in</Text>
              }
            </View>
          )}
        </Pressable>

        {/* Register link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: tokens.textSecondary }}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={{ fontSize: 14, color: tokens.accent, fontWeight: '600' }}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
