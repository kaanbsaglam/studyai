import { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatPanel from '../components/ChatPanel';
import DocumentSelector from '../components/DocumentSelector';
import { useStudyTracker } from '../hooks/useStudyTracker';
import api from '../api/axios';

export default function ChatPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docsLocked, setDocsLocked] = useState(false);
  const [lockedDocIds, setLockedDocIds] = useState([]);
  const { t } = useTranslation();

  // Track study time for chat activity
  useStudyTracker(classroomId, 'CHAT');

  const documents = classroom?.documents || [];
  const hasReadyDocuments = documents.some((d) => d.status === 'READY');
  const selectedDocuments = documents.filter((d) => selectedDocIds.includes(d.id));

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/chat/sessions`);
      setSessions(response.data.data.sessions);
    } catch {
      // Silently fail
    }
  }, [classroomId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSessionChange = (newSessionId) => {
    setActiveSessionId(newSessionId);
    if (newSessionId) {
      // Re-fetch sessions to pick up new one / updated order
      fetchSessions();
    }
    if (!newSessionId) {
      // "New Chat" — unlock docs
      setDocsLocked(false);
      setLockedDocIds([]);
    }
  };

  const handleDocumentsLocked = () => {
    setDocsLocked(true);
    setLockedDocIds([...selectedDocIds]);
  };

  const handleSelectSession = async (session) => {
    setActiveSessionId(session.id);
    // Lock docs to session's documents
    const sessionDocIds = session.documents.map((d) => d.id);
    setSelectedDocIds(sessionDocIds);
    setLockedDocIds(sessionDocIds);
    setDocsLocked(true);
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm(t('chatSessions.deleteConfirm'))) return;
    try {
      await api.delete(`/classrooms/${classroomId}/chat/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setDocsLocked(false);
        setLockedDocIds([]);
      }
    } catch {
      // Silently fail
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setDocsLocked(false);
    setLockedDocIds([]);
    setSelectedDocIds([]);
  };

  const handleDocChange = (newIds) => {
    if (docsLocked) {
      // Only allow adding, not removing locked docs
      const merged = [...new Set([...lockedDocIds, ...newIds])];
      setSelectedDocIds(merged);

      // If new docs were added beyond locked ones, patch the session
      const addedIds = merged.filter((id) => !lockedDocIds.includes(id));
      if (addedIds.length > 0 && activeSessionId) {
        api.patch(`/classrooms/${classroomId}/chat/sessions/${activeSessionId}/documents`, {
          documentIds: addedIds,
        }).catch(() => {});
      }
    } else {
      setSelectedDocIds(newIds);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 min-w-48 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          {/* Sidebar Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">{t('chatSessions.sessions')}</h3>
            <button
              onClick={handleNewChat}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('chatSessions.newChat')}
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                {t('chatSessions.noSessions')}
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 group ${
                    activeSessionId === session.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1">
                      {session.title || t('chatSessions.untitled')}
                    </p>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('chatSessions.messageCount', { count: session._count?.messages || 0 })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with sidebar toggle */}
        <div className="mb-4 flex items-start gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`mt-1 p-1.5 rounded ${
              sidebarOpen ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-200 hover:bg-gray-300'
            }`}
            title={t('chatSessions.toggleSidebar')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{t('chatPage.title')}</h2>
            <p className="text-gray-500 mb-4">
              {t('chatPage.subtitle')}
            </p>

            {/* Document selector */}
            <DocumentSelector
              documents={documents}
              selectedIds={selectedDocIds}
              onChange={handleDocChange}
              disabled={false}
              lockedIds={docsLocked ? lockedDocIds : []}
            />
          </div>
        </div>

        <ChatPanel
          classroomId={classroomId}
          documentIds={selectedDocIds}
          selectedDocuments={selectedDocuments}
          hasReadyDocuments={hasReadyDocuments}
          fullHeight
          sessionId={activeSessionId}
          onSessionChange={handleSessionChange}
          onDocumentsLocked={handleDocumentsLocked}
        />
      </div>
    </div>
  );
}
