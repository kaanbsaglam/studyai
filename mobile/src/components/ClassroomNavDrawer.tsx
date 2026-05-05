import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../app/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NAV_ITEMS = [
  { key: 'overview',   label: 'Overview',   icon: '🏠', screen: 'ClassroomDetail' as keyof RootStackParamList | null },
  { key: 'documents',  label: 'Documents',  icon: '📄', screen: 'Documents'  as keyof RootStackParamList | null },
  { key: 'chat',       label: 'Chat',       icon: '💬', screen: 'Chat' as keyof RootStackParamList | null },
  { key: 'flashcards', label: 'Flashcards', icon: '🃏', screen: 'Flashcards' as keyof RootStackParamList | null },
  { key: 'quizzes',    label: 'Quizzes',    icon: '📝', screen: 'Quizzes'    as keyof RootStackParamList | null },
  { key: 'summaries',  label: 'Summaries',  icon: '📋', screen: 'Summaries' as keyof RootStackParamList | null },
  { key: 'notes',      label: 'Notes',      icon: '🗒️', screen: 'Notes'     as keyof RootStackParamList | null },
] as const;

interface Props {
  classroom?: { id: string; name: string; [key: string]: any } | null;
  classroomId: string;
  classroomName: string;
  activeKey?: string;
  counts?: {
    documents: number;
    flashcardSets: number;
    quizSets: number;
    summaries: number;
    notes: number;
  } | null;
  visible: boolean;
  onClose: () => void;
}

export default function ClassroomNavDrawer({
  classroom,
  classroomId,
  classroomName,
  activeKey,
  counts,
  visible,
  onClose,
}: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const slideAnim = useRef(new Animated.Value(260)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    } else {
      slideAnim.setValue(260);
    }
  }, [visible]);

  const countFor = (key: string): number | string => {
    if (!counts) return '';
    if (key === 'documents')  return counts.documents;
    if (key === 'flashcards') return counts.flashcardSets;
    if (key === 'quizzes')    return counts.quizSets;
    if (key === 'summaries')  return counts.summaries;
    if (key === 'notes')      return counts.notes;
    return '';
  };

  const p = { classroomId, classroomName };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableWithoutFeedback>
            <Animated.View style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 260,
              backgroundColor: tokens.cardBg,
              paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24,
              shadowColor: '#000', shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.15, shadowRadius: 12, elevation: 16,
              transform: [{ translateX: slideAnim }],
            }}>
              {/* Header */}
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Navigation
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.textPrimary, marginTop: 4 }} numberOfLines={1}>
                  {classroom?.name || classroomName}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: tokens.cardBorder, marginHorizontal: 20, marginBottom: 12 }} />

              {NAV_ITEMS.map((item) => {
                const isActive = item.key === activeKey;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      if (!item.screen) return;
                      onClose();
                      const navParams = item.screen === 'ClassroomDetail' && classroom
                        ? { classroom }
                        : p;
                      navigation.navigate(item.screen as any, navParams);
                    }}
                  >
                    {({ pressed }) => (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 13, paddingHorizontal: 20, gap: 14,
                        backgroundColor: isActive
                          ? tokens.accentSoft
                          : pressed ? tokens.btnBgPressed : 'transparent',
                      }}>
                        <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                        <Text style={{
                          fontSize: 15, flex: 1,
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? tokens.accent : tokens.textPrimary,
                        }}>
                          {item.label}
                        </Text>
                        {item.key !== 'chat' && (
                          <View style={{
                            backgroundColor: tokens.accentSoft, borderRadius: 10,
                            paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
                          }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.accent }}>
                              {countFor(item.key)}
                            </Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 16, color: isActive ? tokens.accent : tokens.textMuted }}>›</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
