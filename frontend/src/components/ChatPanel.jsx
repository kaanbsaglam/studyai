import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function ChatPanel({
  classroomId,
  documentIds = [],
  hasReadyDocuments,
  compact,
  fullHeight,
  selectedDocuments = [],
  onClearChat,
}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build conversation history for API
  const getConversationHistory = () => {
    return messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await api.post(`/classrooms/${classroomId}/chat`, {
        question,
        documentIds: documentIds,
        conversationHistory: getConversationHistory(),
      });

      const { answer, sources, hasRelevantContext } = response.data.data;

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
          sources,
          hasRelevantContext,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.error?.message || t('chatPanel.failedToGetAnswer'),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    onClearChat?.();
  };

  const containerClass = compact
    ? 'flex flex-col h-full'
    : fullHeight
    ? 'bg-white rounded-lg shadow flex flex-col h-[calc(100vh-16rem)]'
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
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('chatPanel.clearChat')}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Sources */}
                {message.sources?.length > 0 && (
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

        {/* Loading indicator */}
        {loading && (
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
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
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
