import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { getItem } from '../../lib/storage';
import { BASE_URL, TOKEN_KEY } from '../../lib/api';
import type { RootStackParamList } from '../../app/RootNavigator';
import ClassroomNavDrawer from '../../components/ClassroomNavDrawer';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface TraceRetriever {
  query: string;
  documentIds?: string[];
  mode?: string;
  resultExcerpt?: string;
}
interface TraceTask {
  query: string;
  mode?: string;
  documentIds?: string[];
}
interface Trace {
  tasks: TraceTask[];
  retrievers: TraceRetriever[];
  hasDirectResponse: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  sources?: { documentId: string; documentName: string; excerpt?: string }[];
  trace?: Trace;
  planningTrace?: Trace;
}

type Stage = 'planning' | 'synthesizing' | null;

export default function ChatScreen({ route, navigation }: Props) {
  const { classroomId, classroomName } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetchChatSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const token = await getItem(TOKEN_KEY);
      const response = await fetch(
        `${BASE_URL}/classrooms/${classroomId}/orchestrator-chat/sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        // Backend returns { success: true, data: { sessions: [...], nextCursor } }
        const sessions = result.data?.sessions || [];
        setChatSessions(sessions);
      } else {
        console.error('Failed to fetch sessions:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch chat sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [classroomId]);

  useEffect(() => {
    if (leftDrawerOpen) {
      fetchChatSessions();
    }
  }, [leftDrawerOpen, fetchChatSessions]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, stage]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: question };
    const assistantMsg: Message = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      trace: { tasks: [], retrievers: [], hasDirectResponse: false },
    };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    setStage('planning');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getItem(TOKEN_KEY);
      const response = await fetch(
        `${BASE_URL}/classrooms/${classroomId}/orchestrator-chat/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            question,
            sessionId: sessionIdRef.current ?? undefined,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      // React Native fetch does not expose ReadableStream body — read all at once
      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let event: any;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        if (event.type === 'planning_done') {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                trace: { ...last.trace!, tasks: event.tasks ?? [], hasDirectResponse: !!event.hasDirectResponse },
              };
            }
            return updated;
          });
        } else if (event.type === 'retriever_done') {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                trace: {
                  ...last.trace!,
                  retrievers: [...(last.trace?.retrievers ?? []), {
                    query: event.query, documentIds: event.documentIds,
                    mode: event.mode, resultExcerpt: event.resultExcerpt,
                  }],
                },
              };
            }
            return updated;
          });
        } else if (event.type === 'synthesizing') {
          setStage('synthesizing');
        } else if (event.type === 'chunk') {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = { ...last, content: last.content + event.text };
            }
            return updated;
          });
        } else if (event.type === 'done') {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                isStreaming: false,
                sources: event.sources,
                planningTrace: {
                  tasks: last.trace?.tasks ?? [],
                  retrievers: last.trace?.retrievers ?? [],
                  hasDirectResponse: !!last.trace?.hasDirectResponse,
                },
                trace: undefined,
              };
            }
            return updated;
          });
          if (!sessionIdRef.current && event.sessionId) {
            setSessionId(event.sessionId);
          }
          setStage(null);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && (last.isStreaming || !last.content)) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.message ?? 'Failed to get an answer.',
            isError: true,
            isStreaming: false,
          };
        }
        return updated;
      });
      setStage(null);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setStage(null);
  };

  const handleLoadSession = async (session: ChatSession) => {
    abortRef.current?.abort();
    setSessionId(session.id);
    setMessages([]);
    setStage(null);
    setLeftDrawerOpen(false);
    
    try {
      const token = await getItem(TOKEN_KEY);
      const response = await fetch(
        `${BASE_URL}/classrooms/${classroomId}/orchestrator-chat/sessions/${session.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        // Backend returns { success: true, data: { session: { messages: [...] } } }
        const sessionData = result.data?.session;
        if (sessionData?.messages) {
          const loadedMessages = sessionData.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            isStreaming: false,
            sources: msg.sources,
            planningTrace: msg.trace,
          }));
          setMessages(loadedMessages);
        }
      } else {
        console.error('Failed to load session messages:', response.status);
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.role === 'user') {
      return (
        <View style={{ alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 16 }}>
          <View style={{
            backgroundColor: tokens.accent, borderRadius: 16,
            borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
            maxWidth: '80%',
          }}>
            <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (item.isError) {
      return (
        <View style={{ alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 }}>
          <View style={{
            backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1,
            borderRadius: 16, borderBottomLeftRadius: 4,
            paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%',
          }}>
            <Text style={{ color: '#ef4444', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 }}>
        <View style={{
          backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
          borderRadius: 16, borderBottomLeftRadius: 4,
          paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%',
        }}>
          <Text style={{ color: tokens.textPrimary, fontSize: 14, lineHeight: 22 }}>
            {item.content}
            {item.isStreaming && (
              <Text style={{ color: tokens.textMuted }}> ▋</Text>
            )}
          </Text>
          {item.sources && item.sources.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tokens.cardBorder }}>
              <Text style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 4 }}>Sources</Text>
              {item.sources.map((src, i) => (
                <Text key={i} style={{ fontSize: 11, color: tokens.textSecondary }}>
                  · {src.documentName}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const lastMsg = messages[messages.length - 1];
  const inFlightTrace = lastMsg?.isStreaming ? lastMsg.trace : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.pageBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Left Drawer for Chat Sessions */}
      <Modal
        visible={leftDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLeftDrawerOpen(false)}
      >
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          {/* Drawer Content */}
          <View style={{
            width: '75%', backgroundColor: tokens.pageBg, height: '100%',
            paddingTop: insets.top + 12, paddingBottom: insets.bottom,
          }}>
            {/* Drawer Header */}
            <View style={{ 
              paddingHorizontal: 20, 
              paddingVertical: 20, 
              borderBottomWidth: 1, 
              borderBottomColor: tokens.cardBorder 
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.textPrimary, marginBottom: 6 }}>
                Chat History
              </Text>
              <Text style={{ fontSize: 13, color: tokens.textMuted }}>
                {chatSessions.length} session{chatSessions.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Sessions List */}
            {loadingSessions ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={tokens.accent} />
              </View>
            ) : chatSessions.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 15, color: tokens.textMuted, textAlign: 'center', lineHeight: 22 }}>
                  No chat sessions yet
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingVertical: 12, paddingLeft: 28, paddingRight: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {chatSessions.map((session, index) => (
                  <Pressable
                    key={session.id}
                    onPress={() => handleLoadSession(session)}
                    style={({ pressed }) => ({
                      marginVertical: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: pressed ? tokens.cardBg : tokens.cardBg,
                      borderRadius: 12,
                      borderWidth: sessionId === session.id ? 2 : 1,
                      borderColor: sessionId === session.id ? tokens.accent : tokens.cardBorder,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: tokens.textPrimary,
                              fontWeight: sessionId === session.id ? '700' : '500',
                              marginBottom: 8,
                            }}
                            numberOfLines={1}
                          >
                            Chat #{index + 1}
                          </Text>
                          <Text style={{ fontSize: 12, color: tokens.textMuted, lineHeight: 18 }}>
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </Text>
                          <Text style={{ fontSize: 11, color: tokens.textMuted }}>
                            {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 12 }} />
                      </View>
                    </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Overlay Close Area */}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setLeftDrawerOpen(false)}
          />
        </View>
      </Modal>

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
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Pressable onPress={() => setLeftDrawerOpen(true)} hitSlop={8}>
            {({ pressed }) => (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: tokens.cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: tokens.cardBorder,
                opacity: pressed ? 0.6 : 1,
              }}>
                <Text style={{ fontSize: 14, color: tokens.accent }}>📋</Text>
                <Text style={{ fontSize: 13, color: tokens.textPrimary, fontWeight: '500' }}>History</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {messages.length > 0 && (
            <Pressable onPress={handleNewChat} hitSlop={8}>
              {({ pressed }) => (
                <Text style={{ fontSize: 13, color: tokens.accent, opacity: pressed ? 0.6 : 1, fontWeight: '600' }}>
                  New
                </Text>
              )}
            </Pressable>
          )}
          <Pressable onPress={() => setNavOpen(true)} hitSlop={8}>
            {({ pressed }) => (
              <View style={{ gap: 4, opacity: pressed ? 0.6 : 1 }}>
                <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
                <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
                <View style={{ width: 17, height: 2, borderRadius: 1, backgroundColor: tokens.textPrimary }} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.textPrimary, marginBottom: 6 }}>
            Ask about your documents
          </Text>
          <Text style={{ fontSize: 13, color: tokens.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
            The AI will search and synthesize answers from your classroom materials.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
          ListFooterComponent={
            loading && stage ? <StageIndicator stage={stage} trace={inFlightTrace} tokens={tokens} /> : null
          }
          onContentSizeChange={scrollToBottom}
        />
      )}

      {/* Input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 12,
        paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: insets.bottom + 16,
        borderTopWidth: 1, borderTopColor: tokens.cardBorder,
        backgroundColor: tokens.pageBg,
      }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={tokens.textMuted}
          multiline
          maxLength={2000}
          style={{
            flex: 1, minHeight: 44, maxHeight: 120,
            backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, borderWidth: 1,
            borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12,
            fontSize: 14, color: tokens.textPrimary, lineHeight: 20,
          }}
          editable={!loading}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || loading}
          style={({ pressed }) => ({
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: !input.trim() || loading ? tokens.accentSoft : tokens.accent,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
          })}
        >
          <Text style={{
            fontSize: 24, color: !input.trim() || loading ? tokens.textMuted : '#fff',
            fontWeight: '700',
          }}>
            ➤
          </Text>
        </Pressable>
      </View>

      <ClassroomNavDrawer
        classroomId={classroomId}
        classroomName={classroomName}
        activeKey="chat"
        visible={navOpen}
        onClose={() => setNavOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function StageIndicator({ stage, trace, tokens }: { stage: Stage; trace: any; tokens: any }) {
  const tasks: TraceTask[] = trace?.tasks ?? [];
  const retrievers: TraceRetriever[] = trace?.retrievers ?? [];

  return (
    <View style={{ alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 }}>
      <View style={{
        backgroundColor: tokens.accentSoft, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%', gap: 6,
      }}>
        {stage === 'planning' && tasks.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text style={{ fontSize: 13, color: tokens.accent }}>Planning…</Text>
          </View>
        )}
        {tasks.length > 0 && tasks.map((task, idx) => {
          const done = retrievers.some(r => r.query === task.query);
          return (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {done
                ? <Text style={{ fontSize: 13, color: tokens.accent }}>✓</Text>
                : <ActivityIndicator size="small" color={tokens.accent} />
              }
              <Text style={{ fontSize: 12, color: tokens.accent, flex: 1 }} numberOfLines={1}>
                {done ? 'Retrieved' : 'Searching'}: {task.query}
              </Text>
            </View>
          );
        })}
        {stage === 'synthesizing' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text style={{ fontSize: 13, color: tokens.accent }}>Synthesizing…</Text>
          </View>
        )}
      </View>
    </View>
  );
}
