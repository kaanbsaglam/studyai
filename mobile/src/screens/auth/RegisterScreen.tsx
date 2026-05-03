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
import api from '../../lib/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { name: name.trim(), email: email.trim(), password });
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: tokens.inputBg,
    borderColor: tokens.inputBorder,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 15,
    color: tokens.textPrimary,
    marginBottom: 16,
  } as const;

  const labelStyle = {
    fontSize: 13,
    fontWeight: '500' as const,
    color: tokens.textSecondary,
    marginBottom: 6,
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
        <Text style={{ fontFamily: 'System', fontSize: 28, fontWeight: '700', color: tokens.accent, marginBottom: 8 }}>
          StudyAI
        </Text>
        <Text style={{ fontSize: 16, color: tokens.textSecondary, marginBottom: 40 }}>
          Create your account
        </Text>

        <Text style={labelStyle}>Name</Text>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={tokens.textMuted}
          autoCapitalize="words"
        />

        <Text style={labelStyle}>Email</Text>
        <TextInput
          style={inputStyle}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={tokens.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={labelStyle}>Password</Text>
        <TextInput
          style={{ ...inputStyle, marginBottom: 24 }}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          placeholderTextColor={tokens.textMuted}
          secureTextEntry
        />

        {!!error && (
          <Text style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</Text>
        )}

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: tokens.btnPrimaryBg,
            borderRadius: 10,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || loading ? 0.8 : 1,
            marginBottom: 20,
          })}
        >
          {loading
            ? <ActivityIndicator color={tokens.btnPrimaryText} />
            : <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.btnPrimaryText }}>Create account</Text>
          }
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: tokens.textSecondary }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={{ fontSize: 14, color: tokens.accent, fontWeight: '600' }}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
