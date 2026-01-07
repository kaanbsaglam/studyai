import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

export default function ChatPanel({ classroomId, hasReadyDocuments }) {
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
          content: err.response?.data?.error?.message || 'Failed to get answer. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">AI Study Assistant</h3>
        <p className="text-sm text-gray-500">
          Ask questions about your documents
        </p>
      </div>

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
            <p className="mt-2">No messages yet</p>
            <p className="text-sm">
              {hasReadyDocuments
                ? 'Ask a question to get started'
                : 'Upload and process documents first'}
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
                    <p className="text-xs text-gray-500 mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded"
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
                      (General knowledge - not from your documents)
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
                <span className="text-gray-500">Thinking...</span>
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
                ? 'Ask a question...'
                : 'Upload documents first...'
            }
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
