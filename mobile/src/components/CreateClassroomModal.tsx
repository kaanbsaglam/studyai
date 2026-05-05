import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export default function CreateClassroomModal({ visible, onClose, onCreate }: Props) {
  const { tokens } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onCreate(name.trim(), description.trim());
      reset();
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? e.message ?? 'Failed to create classroom.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Stop tap inside sheet from closing */}
          <Pressable onPress={() => {}}>
            <View style={{
              backgroundColor: tokens.cardBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 36,
            }}>
              {/* Handle bar */}
              <View style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: tokens.cardBorder,
                alignSelf: 'center',
                marginBottom: 20,
              }} />

              <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.textPrimary, marginBottom: 20 }}>
                New Classroom
              </Text>

              {/* Name */}
              <Text style={{ fontSize: 13, fontWeight: '500', color: tokens.textSecondary, marginBottom: 6 }}>
                Name *
              </Text>
              <TextInput
                style={{
                  backgroundColor: tokens.inputBg,
                  borderColor: error && !name.trim() ? '#ef4444' : tokens.inputBorder,
                  borderWidth: 1,
                  borderRadius: 10,
                  height: 44,
                  paddingHorizontal: 14,
                  fontSize: 15,
                  color: tokens.textPrimary,
                  marginBottom: 16,
                }}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Biology 101"
                placeholderTextColor={tokens.textMuted}
                autoFocus
                returnKeyType="next"
              />

              {/* Description */}
              <Text style={{ fontSize: 13, fontWeight: '500', color: tokens.textSecondary, marginBottom: 6 }}>
                Description
              </Text>
              <TextInput
                style={{
                  backgroundColor: tokens.inputBg,
                  borderColor: tokens.inputBorder,
                  borderWidth: 1,
                  borderRadius: 10,
                  height: 88,
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  fontSize: 15,
                  color: tokens.textPrimary,
                  marginBottom: 8,
                  textAlignVertical: 'top',
                }}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={tokens.textMuted}
                multiline
                numberOfLines={3}
              />

              {!!error && (
                <Text style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</Text>
              )}

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Pressable onPress={handleClose} style={{ flex: 1 }} disabled={loading}>
                  {({ pressed }) => (
                    <View style={{
                      backgroundColor: tokens.btnBg,
                      borderColor: tokens.btnBorder,
                      borderWidth: 1,
                      borderRadius: 10,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.textPrimary }}>Cancel</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable onPress={handleSubmit} style={{ flex: 1 }} disabled={loading}>
                  {({ pressed }) => (
                    <View style={{
                      backgroundColor: tokens.btnPrimaryBg,
                      borderRadius: 10,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed || loading ? 0.8 : 1,
                    }}>
                      {loading
                        ? <ActivityIndicator color={tokens.btnPrimaryText} />
                        : <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.btnPrimaryText }}>Create</Text>
                      }
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
