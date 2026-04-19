import { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatPanel from '../components/ChatPanel';
import OrchestratorChatPanel from '../components/OrchestratorChatPanel';
import DocumentSelector from '../components/DocumentSelector';
import { useStudyTracker } from '../hooks/useStudyTracker';
import { useChatMode } from '../context/ChatModeContext';
import { CHAT_MODES } from '../context/chatModeConstants';
import api from '../api/axios';
import {
  listOrchestratorSessions,
  deleteOrchestratorSession,
} from '../api/orchestratorChat';

export default function ChatPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const { mode } = useChatMode();
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docsLocked, setDocsLocked] = useState(false);
  const [lockedDocIds, setLockedDocIds] = useState([]);
  const { t } = useTranslation();

  useStudyTracker(classroomId, 'CHAT');

  const documents = classroom?.documents || [];
  const hasReadyDocuments = documents.some((d) => d.status === 'READY');
  const selectedDocuments = documents.filter((d) => selectedDocIds.includes(d.id));
  const isOrchestrator = mode === CHAT_MODES.ORCHESTRATOR;

  const fetchSessions = useCallback(async () => {
    try {
      if (isOrchestrator) {
        const list = await listOrchestratorSessions(classroomId);
        setSessions(list);
      } else {
        const response = await api.get(`/classrooms/${classroomId}/chat/sessions`);
        setSessions(response.data.data.sessions);
      }
    } catch {
      setSessions([]);
    }
  }, [classroomId, isOrchestrator]);

  // Reset UI state when mode flips so histories stay separate.
  useEffect(() => {
    setActiveSessionId(null);
    setDocsLocked(false);
    setLockedDocIds([]);
    setSelectedDocIds([]);
  }, [mode]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSessionChange = (newSessionId) => {
    setActiveSessionId(newSessionId);
    if (newSessionId) {
      fetchSessions();
    }
    if (!newSessionId) {
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
    // Orchestrator sessions don't track per-session doc selection (planner
    // sees the whole classroom), so only restore doc lock for standard chat.
    if (!isOrchestrator) {
      const sessionDocIds = session.documents?.map((d) => d.id) || [];
      setSelectedDocIds(sessionDocIds);
      setLockedDocIds(sessionDocIds);
      setDocsLocked(true);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm(t('chatSessions.deleteConfirm'))) return;
    try {
      if (isOrchestrator) {
        await deleteOrchestratorSession(classroomId, sessionId);
      } else {
        await api.delete(`/classrooms/${classroomId}/chat/sessions/${sessionId}`);
      }
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
      const merged = [...new Set([...lockedDocIds, ...newIds])];
      setSelectedDocIds(merged);
      const addedIds = merged.filter((id) => !lockedDocIds.includes(id));
      if (addedIds.length > 0 && activeSessionId) {
        api
          .patch(
            `/classrooms/${classroomId}/chat/sessions/${activeSessionId}/documents`,
            { documentIds: addedIds },
          )
          .catch(() => {});
      }
    } else {
      setSelectedDocIds(newIds);
    }
  };

  const pageTitle = isOrchestrator ? t('orchestratorChat.assistant') : t('chatPage.title');
  const pageSubtitle = isOrchestrator ? t('orchestratorChat.subtitle') : t('chatPage.subtitle');

  return (
    <div className="flex h-[calc(100vh-12rem)] items-stretch gap-4 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 min-w-48 flex h-full flex-col bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex shrink-0 justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900">{t('chatSessions.sessions')}</h3>
              {isOrchestrator && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                  {t('orchestratorChat.modeBadge')}
                </span>
              )}
            </div>
            <button
              onClick={handleNewChat}
              className={`text-xs px-2 py-1 text-white rounded-full ${
                isOrchestrator ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {t('chatSessions.newChat')}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                {t('chatSessions.noSessions')}
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`notes-entry-divider px-4 py-2 cursor-pointer hover:bg-gray-50 group ${
                    activeSessionId === session.id
                      ? isOrchestrator
                        ? 'bg-purple-50 border-l-2 border-l-purple-600'
                        : 'bg-blue-50 border-l-2 border-l-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-900 truncate flex-1 pr-2">
                      {session.title || t('chatSessions.untitled')}
                    </p>
                    <span
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0 transition-opacity"
                      title={t('common.delete')}
                      role="button"
                      tabIndex={0}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l.5 11a1 1 0 001 .955h6a1 1 0 001-.955L17 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-start gap-3 pb-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`mt-1 p-1.5 rounded-full focus:ring-0 ${
              sidebarOpen
                ? isOrchestrator
                  ? 'text-purple-700 bg-purple-100'
                  : 'text-blue-700 bg-blue-100'
                : 'text-gray-500 bg-gray-200 hover:bg-gray-300'
            }`}
            title={t('chatSessions.toggleSidebar')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-0 pt-0.5">
              <h2 className="text-base font-semibold text-gray-900">{pageTitle}</h2>
              <p className="text-xs text-gray-500 leading-tight">{pageSubtitle}</p>
            </div>

            {!isOrchestrator && (
              <div className="min-w-[20rem] flex-none w-full max-w-[24rem]">
                <DocumentSelector
                  documents={documents}
                  selectedIds={selectedDocIds}
                  onChange={handleDocChange}
                  disabled={false}
                  lockedIds={docsLocked ? lockedDocIds : []}
                  showHelpText={true}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isOrchestrator ? (
            <OrchestratorChatPanel
              classroomId={classroomId}
              hasReadyDocuments={hasReadyDocuments}
              fullHeight
              sessionId={activeSessionId}
              onSessionChange={handleSessionChange}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
