import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';
import {
  getOrchestratorSession,
  streamOrchestratorMessage,
} from '../api/orchestratorChat';

/**
 * Orchestrator Chat Panel (PREMIUM)
 *
 * Renders staged SSE events from the LangGraph orchestrator:
 *   planning → planning_done → retriever_done[] → synthesizing → chunk[] → done
 *
 * Each assistant message stores its reasoning trace (planner tasks + retriever
 * excerpts) so the user can expand and inspect what the graph did.
 */
export default function OrchestratorChatPanel({
  classroomId,
  hasReadyDocuments,
  fullHeight,
  sessionId,
  onSessionChange,
}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [stage, setStage] = useState(null); // 'planning' | 'synthesizing' | null
  const messagesEndRef = useRef(null);
  const prevSessionIdRef = useRef(sessionId);
  const abortRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, stage]);

  // Cancel any in-flight stream on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const loadSession = useCallback(
    async (sid) => {
      if (!sid) {
        setMessages([]);
        return;
      }
      try {
        setLoadingSession(true);
        const session = await getOrchestratorSession(classroomId, sid);
        setMessages(
          session.messages.map((m) => ({
            role: m.role.toLowerCase(),
            content: m.content,
            sources: m.sources,
            planningTrace: m.planningTrace,
            stageTokens: m.stageTokens,
          })),
        );
      } catch {
        setMessages([]);
      } finally {
        setLoadingSession(false);
      }
    },
    [classroomId],
  );

  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = sessionId;
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isStreaming: true,
        trace: { tasks: [], retrievers: [], hasDirectResponse: false },
      },
    ]);
    setLoading(true);
    setStage('planning');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const stream = streamOrchestratorMessage({
        classroomId,
        question,
        sessionId,
        signal: controller.signal,
      });

      for await (const event of stream) {
        if (event.type === 'planning_done') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                trace: {
                  ...last.trace,
                  tasks: event.tasks || [],
                  hasDirectResponse: !!event.hasDirectResponse,
                },
              };
            }
            return updated;
          });
        } else if (event.type === 'retriever_done') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                trace: {
                  ...last.trace,
                  retrievers: [
                    ...(last.trace?.retrievers || []),
                    {
                      query: event.query,
                      documentIds: event.documentIds,
                      resultExcerpt: event.resultExcerpt,
                    },
                  ],
                },
              };
            }
            return updated;
          });
        } else if (event.type === 'synthesizing') {
          setStage('synthesizing');
        } else if (event.type === 'chunk') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + event.text,
              };
            }
            return updated;
          });
        } else if (event.type === 'done') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = {
                ...last,
                isStreaming: false,
                sources: event.sources,
                // Bake the in-flight trace into a canonical shape that
                // matches what we get back from the backend on reload.
                planningTrace: {
                  tasks: last.trace?.tasks || [],
                  retrievers: last.trace?.retrievers || [],
                  hasDirectResponse: !!last.trace?.hasDirectResponse,
                },
              };
            }
            return updated;
          });

          if (!sessionId && event.sessionId) {
            prevSessionIdRef.current = event.sessionId;
            onSessionChange?.(event.sessionId);
          }
          setStage(null);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && (last.isStreaming || !last.content)) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.message || t('orchestratorChat.failedToGetAnswer'),
            isError: true,
            isStreaming: false,
          };
        } else {
          updated.push({
            role: 'assistant',
            content: err.message || t('orchestratorChat.failedToGetAnswer'),
            isError: true,
          });
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
    prevSessionIdRef.current = null;
    onSessionChange?.(null);
  };

  const containerClass = fullHeight
    ? 'bg-white rounded-lg shadow flex h-full min-h-0 flex-col overflow-hidden'
    : 'bg-white rounded-lg shadow flex flex-col h-[500px]';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">
                {t('orchestratorChat.assistant')}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                {t('orchestratorChat.modeBadge')}
              </span>
            </div>
            <p className="text-xs text-gray-500">{t('orchestratorChat.subtitle')}</p>
          </div>
        </div>
        {(messages.length > 0 || sessionId) && (
          <button
            onClick={handleNewChat}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('chatSessions.newChat')}
          </button>
        )}
      </div>

      {loadingSession && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">
            {t('chatSessions.loadingSession')}
          </span>
        </div>
      )}

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
              <MessageBubble key={index} message={message} t={t} />
            ))
          )}

          {/* Staged progress indicator (while streaming) */}
          {loading && stage && (
            <StageIndicator
              stage={stage}
              trace={messages[messages.length - 1]?.trace}
              t={t}
            />
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || loadingSession || !input.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Reuse common.send */}
            {t('common.send')}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message, t }) {
  const [traceOpen, setTraceOpen] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-purple-600 text-white">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-red-50 text-red-600 border border-red-200">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const trace = message.planningTrace || message.trace;
  const hasTrace =
    !!trace && ((trace.tasks && trace.tasks.length > 0) || (trace.retrievers && trace.retrievers.length > 0) || trace.hasDirectResponse);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
        <MarkdownRenderer className="prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
          {message.content}
        </MarkdownRenderer>
        {message.isStreaming && (
          <span
            className="inline-block w-2 h-4 bg-gray-500 ml-0.5 align-middle"
            style={{ animation: 'blink 1s step-end infinite' }}
          />
        )}

        {/* Reasoning trace */}
        {hasTrace && !message.isStreaming && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setTraceOpen((v) => !v)}
              className="text-xs text-purple-700 hover:text-purple-900 font-medium"
            >
              {traceOpen
                ? t('orchestratorChat.hideTrace')
                : t('orchestratorChat.showTrace')}
            </button>
            {traceOpen && <TraceView trace={trace} t={t} />}
          </div>
        )}

        {/* Sources */}
        {!message.isStreaming && message.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t('chatPanel.sources')}</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700"
                >
                  {source.filename}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TraceView({ trace, t }) {
  if (trace?.hasDirectResponse && (!trace.tasks || trace.tasks.length === 0)) {
    return (
      <p className="mt-2 text-xs text-gray-600 italic">
        {t('orchestratorChat.planningDoneDirect')}
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {trace.tasks?.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">
            {t('orchestratorChat.tasks')}
          </p>
          <ul className="space-y-2">
            {trace.tasks.map((task, idx) => {
              const retriever = trace.retrievers?.find((r) => r.query === task.query);
              return (
                <li key={idx} className="text-xs bg-white p-2 rounded border border-gray-200">
                  <p className="font-medium text-gray-800">
                    {t('orchestratorChat.task', { index: idx + 1 })}
                  </p>
                  <p className="text-gray-700 mt-0.5">
                    <span className="text-gray-500">{t('orchestratorChat.query')}:</span>{' '}
                    {task.query}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {t('orchestratorChat.documents')}: {task.documentIds?.length || 0}
                  </p>
                  {retriever?.resultExcerpt && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      <p className="text-gray-500">
                        {t('orchestratorChat.retrieverResult')}:
                      </p>
                      <p className="text-gray-600 italic">
                        {retriever.resultExcerpt}
                        {retriever.resultExcerpt.length >= 200 && '…'}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">{t('orchestratorChat.noTasks')}</p>
      )}
    </div>
  );
}

function StageIndicator({ stage, trace, t }) {
  const tasks = trace?.tasks || [];
  const retrievers = trace?.retrievers || [];

  return (
    <div className="flex justify-start">
      <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-2 text-xs text-purple-800 space-y-1 max-w-[80%]">
        {stage === 'planning' && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700"></div>
            <span>{t('orchestratorChat.planning')}</span>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            {trace?.hasDirectResponse && tasks.length === 0 ? (
              <span>{t('orchestratorChat.planningDoneDirect')}</span>
            ) : (
              <span>
                {t('orchestratorChat.planningDone', { count: tasks.length })}
              </span>
            )}
          </div>
        )}

        {tasks.length > 0 &&
          tasks.map((task, idx) => {
            const done = retrievers.some((r) => r.query === task.query);
            return (
              <div key={idx} className="flex items-center gap-2">
                {done ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700"></div>
                )}
                <span className="truncate max-w-[20rem]">
                  {done
                    ? t('orchestratorChat.retrieverDone')
                    : t('orchestratorChat.retrieverRunning')}
                  : {task.query}
                </span>
              </div>
            );
          })}

        {stage === 'synthesizing' && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700"></div>
            <span>{t('orchestratorChat.synthesizing')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

