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
import AudioPlayer from '../../components/AudioPlayer';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteReader'>;
type Env<T> = { success: boolean; data: T };

interface NoteDetail {
  id: string;
  title: string;
  content: string;
  mimeType: string | null;
  originalName: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
  classroom: { id: string; name: string };
  document: { id: string; originalName: string } | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NoteReaderScreen({ route, navigation }: Props) {
  const { noteId, noteTitle } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [note, setNote]       = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Env<{ note: NoteDetail }>>(`/notes/${noteId}`);
      setNote(res.data.data.note);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load note.');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => { load(); }, [load]);

  const isAudio = !!note?.mimeType;

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
            {noteTitle}
          </Text>
          {note && (
            <Text style={{ fontSize: 12, color: tokens.textMuted }}>
              {isAudio ? 'Audio note' : 'Text note'} · {new Date(note.updatedAt).toLocaleDateString()}
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
      ) : note ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
          {/* Metadata card */}
          <View style={{
            backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
            borderRadius: 12, padding: 14, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <View style={{ backgroundColor: tokens.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.accent }}>
                  {isAudio ? 'Audio' : 'Text'}
                </Text>
              </View>
              {isAudio && note.size != null && (
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatBytes(note.size)}</Text>
              )}
              <Text style={{ fontSize: 11, color: tokens.textMuted }}>
                Created {new Date(note.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {note.document && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>Source:</Text>
                <Text style={{ fontSize: 11, color: tokens.textSecondary, flex: 1 }} numberOfLines={1}>
                  {note.document.originalName}
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          {isAudio ? (
            <AudioPlayer
              title={note.originalName ?? note.title}
              fetchUrl={async () => {
                const res = await api.get<{ success: boolean; data: { url: string } }>(`/notes/${note.id}/stream`);
                return res.data.data.url;
              }}
            />
          ) : note.content ? (
            <View style={{
              backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
              borderRadius: 12, padding: 16,
            }}>
              <MarkdownRenderer content={note.content} noScroll />
            </View>
          ) : (
            <View style={{
              backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
              borderRadius: 12, padding: 32, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 14, color: tokens.textMuted }}>This note is empty.</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
