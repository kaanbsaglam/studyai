import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';
import api from '../api/axios';

export default function ChatPanel({
  classroomId,
  documentIds = [],
  hasReadyDocuments,
  compact,
  fullHeight,
  selectedDocuments = [],
  sessionId,
  onSessionChange,
  onDocumentsLocked,
}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const messagesEndRef = useRef(null);
  const prevSessionIdRef = useRef(sessionId);
  const wordQueueRef = useRef([]);
  const dripIntervalRef = useRef(null);
  const pendingDoneRef = useRef(null); // stores 'done' event data until drip finishes

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup drip interval on unmount
  useEffect(() => {
    return () => {
      if (dripIntervalRef.current) clearInterval(dripIntervalRef.current);
    };
  }, []);

  // Load session messages when sessionId changes
  const loadSession = useCallback(async (sid) => {
    if (!sid) {
      setMessages([]);
      return;
    }
    try {
      setLoadingSession(true);
      const response = await api.get(`/classrooms/${classroomId}/chat/sessions/${sid}`);
      const { session } = response.data.data;
      setMessages(
        session.messages.map((m) => ({
          role: m.role.toLowerCase(),
          content: m.content,
          sources: m.sources,
          hasRelevantContext: m.hasRelevantContext,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  }, [classroomId]);

  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = sessionId;
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  /**
   * Finalize the message after drip is complete
   */
  const finalizeMessage = (doneEvent) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        updated[updated.length - 1] = {
          ...lastMsg,
          isStreaming: false,
          sources: doneEvent.sources,
          hasRelevantContext: doneEvent.hasRelevantContext,
        };
      }
      return updated;
    });

    if (!sessionId && doneEvent.sessionId) {
      prevSessionIdRef.current = doneEvent.sessionId;
      onSessionChange?.(doneEvent.sessionId);
      onDocumentsLocked?.();
    }

    setLoading(false);
  };

  /**
   * Drip words one-by-one from the queue into the streaming message.
   * When queue empties and stream is done, finalize naturally.
   */
  const startDrip = () => {
    if (dripIntervalRef.current) return; // already running
    dripIntervalRef.current = setInterval(() => {
      if (wordQueueRef.current.length === 0) {
        clearInterval(dripIntervalRef.current);
        dripIntervalRef.current = null;

        // If stream already ended, finalize now that drip is done
        if (pendingDoneRef.current) {
          const doneEvent = pendingDoneRef.current;
          pendingDoneRef.current = null;
          finalizeMessage(doneEvent);
        }
        return;
      }
      const word = wordQueueRef.current.shift();
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + word,
          };
        }
        return updated;
      });
    }, 30);
  };

  /**
   * Stop drip and clear queue (only used for errors).
   */
  const stopDrip = () => {
    if (dripIntervalRef.current) {
      clearInterval(dripIntervalRef.current);
      dripIntervalRef.current = null;
    }
    wordQueueRef.current = [];
    pendingDoneRef.current = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    // Add user message optimistically
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    // Reset state
    wordQueueRef.current = [];
    pendingDoneRef.current = null;

    // Add placeholder assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${api.defaults.baseURL}/classrooms/${classroomId}/chat/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            question,
            sessionId: sessionId || undefined,
            documentIds,
          }),
        }
      );

      // If the response is not SSE (error before streaming started), handle as JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || t('chatPanel.failedToGetAnswer'));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'chunk') {
              // Split chunk into words and queue for smooth drip
              const words = event.text.split(/(\s+)/); // preserve whitespace
              wordQueueRef.current.push(...words);
              startDrip();
            } else if (event.type === 'done') {
              // Store done event — drip will finalize when queue empties
              pendingDoneRef.current = event;

              // If queue is already empty, finalize immediately
              if (wordQueueRef.current.length === 0 && !dripIntervalRef.current) {
                pendingDoneRef.current = null;
                finalizeMessage(event);
              }
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // If it's our own rethrown error, propagate it
            if (parseErr.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
            // Otherwise ignore malformed SSE line
          }
        }
      }

      // Safety: if stream ended without a done event, mark streaming as done
      if (!pendingDoneRef.current) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.isStreaming) {
            updated[updated.length - 1] = { ...lastMsg, isStreaming: false };
          }
          return updated;
        });
      }
    } catch (err) {
      // Stop drip on error
      stopDrip();
      // On error, update the streaming message to show error or add new error message
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && (lastMsg.isStreaming || !lastMsg.content)) {
          // Replace the empty/streaming placeholder with error
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.message || t('chatPanel.failedToGetAnswer'),
            isError: true,
            isStreaming: false,
          };
        } else {
          // Add error as new message
          updated.push({
            role: 'assistant',
            content: err.message || t('chatPanel.failedToGetAnswer'),
            isError: true,
          });
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    prevSessionIdRef.current = null;
    onSessionChange?.(null);
  };

  const containerClass = compact
    ? 'flex h-full min-h-0 flex-col'
    : fullHeight
    ? 'bg-white rounded-lg shadow flex h-full min-h-0 flex-col overflow-hidden'
    : 'bg-white rounded-lg shadow flex flex-col h-[500px]';

  return (
    <div className={containerClass}>
      {/* Header */}
      {!compact && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('chatPanel.aiAssistant')}</h3>
            <p className="text-sm text-gray-500">
              {documentIds.length > 0
                ? t('chatPanel.docsSelected', { count: documentIds.length })
                : t('chatPanel.askAboutDocs')}
            </p>
          </div>
          {(messages.length > 0 || sessionId) && (
            <button
              onClick={handleNewChat}
              className="min-w-[110px] text-center text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
            >
              {t('chatSessions.newChat')}
            </button>
          )}
        </div>
      )}

      {/* Selected documents indicator (compact mode) */}
      {compact && selectedDocuments.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-200 bg-blue-50">
          <p className="text-xs text-blue-700">
            Context: {selectedDocuments.map((d) => d.originalName).join(', ')}
          </p>
        </div>
      )}

      {/* Loading session indicator */}
      {loadingSession && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">{t('chatSessions.loadingSession')}</span>
        </div>
      )}

      {/* Messages */}
      {!loadingSession && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="mt-2">{t('chatPanel.noMessages')}</p>
              <p className="text-sm">
                {hasReadyDocuments
                  ? t('chatPanel.askToStart')
                  : t('chatPanel.uploadFirst')}
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'user' || message.isError ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <>
                      <MarkdownRenderer className="prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
                        {message.content}
                      </MarkdownRenderer>
                      {message.isStreaming && (
                        <span
                          className="inline-block w-2 h-4 bg-gray-500 ml-0.5 align-middle"
                          style={{ animation: 'blink 1s step-end infinite' }}
                        />
                      )}
                    </>
                  )}

                  {/* Sources - only show when not streaming */}
                  {!message.isStreaming && message.sources?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">{t('chatPanel.sources')}</p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded ${
                              source.isSelected
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                            title={source.isSelected ? 'Selected document' : 'From RAG search'}
                          >
                            {source.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indicator for general knowledge answers */}
                  {message.role === 'assistant' &&
                    !message.isError &&
                    message.hasRelevantContext === false && (
                      <p className="mt-2 text-xs text-gray-500 italic">
                        {t('chatPanel.generalKnowledge')}
                      </p>
                    )}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator - only when waiting for first chunk */}
          {loading && !messages.some((m) => m.isStreaming) && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-gray-500">{t('chatPanel.thinking')}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasReadyDocuments
                ? t('chatPanel.askQuestion')
                : t('chatPanel.uploadDocsFirst')
            }
            disabled={loading || loadingSession}
            className={`flex-1 px-4 py-2 border border-gray-300 ${compact ? 'rounded-full' : 'rounded-lg'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100`}
          />
          <button
            type="submit"
            disabled={loading || loadingSession || !input.trim()}
            className={`px-4 py-2 bg-blue-600 text-white ${compact ? 'rounded-full' : 'rounded-lg'} hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {t('common.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
