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
import AudioPlayer from '../../components/AudioPlayer';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentReader'>;
type Env<T> = { success: boolean; data: T };

interface Chunk {
  id: string;
  chunkIndex: number;
  content: string;
}

interface DocumentDetail {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
  chunks: Chunk[];
}

const CODE_EXTENSIONS: Record<string, string> = {
  js: 'JavaScript', jsx: 'JavaScript (JSX)',
  ts: 'TypeScript', tsx: 'TypeScript (TSX)',
  py: 'Python',
  java: 'Java', kt: 'Kotlin', swift: 'Swift',
  c: 'C', cpp: 'C++', cc: 'C++', h: 'C Header', hpp: 'C++ Header',
  cs: 'C#', go: 'Go', rs: 'Rust', rb: 'Ruby',
  php: 'PHP', sh: 'Shell', bash: 'Bash', zsh: 'Shell',
  html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass',
  json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML',
  toml: 'TOML', ini: 'INI', sql: 'SQL', md: 'Markdown',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  gradle: 'Gradle', cmake: 'CMake', r: 'R',
};

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function isPdf(mimeType: string, filename: string) {
  return mimeType === 'application/pdf' || getExt(filename) === 'pdf';
}

function isDocx(mimeType: string, filename: string) {
  return mimeType.includes('wordprocessingml') || getExt(filename) === 'docx';
}

function isNotebook(filename: string) {
  return getExt(filename) === 'ipynb';
}

function isAudio(mimeType: string) {
  return mimeType.startsWith('audio/');
}

function isCode(mimeType: string, filename: string) {
  const ext = getExt(filename);
  return !!CODE_EXTENSIONS[ext] || (mimeType.startsWith('text/') && !isPdf(mimeType, filename));
}

function langLabel(mimeType: string, filename: string) {
  const ext = getExt(filename);
  return CODE_EXTENSIONS[ext] ?? (mimeType.startsWith('text/') ? ext.toUpperCase() : 'Text');
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function PdfView({ documentName, tokens }: {
  documentName: string;
  tokens: any;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
      <Text style={{ fontSize: 48 }}>📄</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.textPrimary, textAlign: 'center' }}>
        {documentName}
      </Text>
      <Text style={{ fontSize: 13, color: tokens.textMuted, textAlign: 'center', lineHeight: 20 }}>
        PDF preview coming soon.
      </Text>
    </View>
  );
}

function NotebookView({ text, tokens }: { text: string; tokens: any }) {
  let cells: Array<{ cell_type: string; source: string[] | string; outputs?: any[] }> = [];
  try {
    const nb = JSON.parse(text);
    cells = nb.cells ?? nb.worksheets?.[0]?.cells ?? [];
  } catch {
    return (
      <View style={{ backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#cdd6f4', lineHeight: 20 }}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {cells.map((cell, i) => {
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        const outputs: string[] = (cell.outputs ?? []).reduce((acc: string[], out: any) => {
          if (out.text) acc.push(Array.isArray(out.text) ? out.text.join('') : out.text);
          if (out.traceback) acc.push((out.traceback as string[]).join('\n'));
          return acc;
        }, []);

        if (cell.cell_type === 'code') {
          return (
            <View key={i} style={{ backgroundColor: '#1e1e2e', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: tokens.accent }}>
              <Text style={{ fontSize: 10, color: '#888', marginBottom: 6, fontFamily: 'monospace' }}>In [{i + 1}]</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#cdd6f4', lineHeight: 18 }}>{source}</Text>
              </ScrollView>
              {outputs.length > 0 && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#313244' }}>
                  <Text style={{ fontSize: 10, color: '#888', marginBottom: 4, fontFamily: 'monospace' }}>Out [{i + 1}]</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#a6e3a1', lineHeight: 18 }}>{outputs.join('\n')}</Text>
                </View>
              )}
            </View>
          );
        }

        if (cell.cell_type === 'markdown' || cell.cell_type === 'raw') {
          return (
            <View key={i} style={{ paddingHorizontal: 4, paddingVertical: 2 }}>
              <Text style={{ fontSize: 14, color: tokens.textPrimary, lineHeight: 22 }}>{source}</Text>
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}

function CodeView({ text, lang, tokens }: { text: string; lang: string; tokens: any }) {
  return (
    <View style={{ backgroundColor: '#1e1e2e', borderRadius: 10, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#313244' }}>
        <Text style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{lang}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#cdd6f4', lineHeight: 20 }}>{text}</Text>
      </ScrollView>
    </View>
  );
}

function TextView({ text, tokens }: { text: string; tokens: any }) {
  return (
    <Text style={{ fontSize: 15, color: tokens.textPrimary, lineHeight: 24 }}>{text}</Text>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DocumentReaderScreen({ route, navigation }: Props) {
  const { documentId, documentName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [doc, setDoc]         = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Env<{ document: DocumentDetail }>>(`/documents/${documentId}`);
      setDoc(res.data.data.document);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  const isPdfDoc   = doc ? isPdf(doc.mimeType, doc.originalName) : false;
  const isAudioDoc = doc ? isAudio(doc.mimeType) : false;
  const isDocxDoc  = doc ? isDocx(doc.mimeType, doc.originalName) : false;
  const isNbDoc    = doc ? isNotebook(doc.originalName) : false;
  const isCodeDoc  = doc ? isCode(doc.mimeType, doc.originalName) : false;

  const extractedText = doc?.chunks
    ?.sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(c => c.content)
    .join('\n\n');

  return (
    <View style={{ flex: 1, backgroundColor: tokens.pageBg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderBottomWidth: 1, borderBottomColor: tokens.cardBorder,
      }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          {({ pressed }) => (
            <Text style={{ fontSize: 28, lineHeight: 32, opacity: pressed ? 0.5 : 1, color: tokens.accent }}>‹</Text>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.textPrimary }} numberOfLines={1}>
            {documentName}
          </Text>
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 15, color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <Pressable
            onPress={load}
            style={({ pressed }) => ({
              backgroundColor: tokens.btnPrimaryBg, borderRadius: 10,
              paddingVertical: 10, paddingHorizontal: 20, opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: tokens.btnPrimaryText, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : doc ? (
        isPdfDoc ? (
          <PdfView documentName={documentName} tokens={tokens} />
        ) : isAudioDoc ? (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
            <AudioPlayer
              title={doc.originalName}
              fetchUrl={async () => {
                const res = await api.get<Env<{ url: string }>>(`/documents/${documentId}/stream`);
                return res.data.data.url;
              }}
            />
          </ScrollView>
        ) : doc.status === 'PROCESSING' || doc.status === 'PENDING' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={tokens.accent} />
            <Text style={{ fontSize: 14, color: tokens.textMuted }}>Document is being processed…</Text>
          </View>
        ) : doc.status === 'FAILED' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 14, color: '#ef4444', textAlign: 'center' }}>
              {doc.errorMessage ?? 'Processing failed.'}
            </Text>
          </View>
        ) : !extractedText ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: tokens.textMuted }}>No content available.</Text>
          </View>
        ) : (
          // All other types: scrollable content
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: insets.bottom + 32,
            }}
          >
            {isNbDoc ? (
              <NotebookView text={extractedText} tokens={tokens} />
            ) : isCodeDoc ? (
              <CodeView
                text={extractedText}
                lang={langLabel(doc.mimeType, doc.originalName)}
                tokens={tokens}
              />
            ) : (
              <TextView text={extractedText} tokens={tokens} />
            )}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}
