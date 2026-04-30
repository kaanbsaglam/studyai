import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axios';
import ChatPanel from '../components/ChatPanel';
import FlashcardsPanel from '../components/FlashcardsPanel';
import QuizPanel from '../components/QuizPanel';
import SummaryPanel from '../components/SummaryPanel';
import NotesPanel from '../components/NotesPanel';
import CodeViewer, { isCodeFileByName } from '../components/CodeViewer';
import IpynbViewer, { isNotebookFileByName } from '../components/IpynbViewer';
import DocumentTabs, { MAX_OPEN_TABS } from '../components/DocumentTabs';
import { useStudyTracker } from '../hooks/useStudyTracker';
import { useTranslation } from 'react-i18next';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentViewerPage() {
  const { id: classroomId, docId } = useParams();
  const { classroom } = useOutletContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Track study time for this document
  useStudyTracker(classroomId, 'DOCUMENT', docId);

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [codeContent, setCodeContent] = useState(null); // Raw code string for code files
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true); // Both panels open by default

  // PDF container width for auto-fit
  const pdfContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  // Document selection - current doc is pre-selected
  const [selectedDocIds, setSelectedDocIds] = useState([docId]);
  const [showDocSelector, setShowDocSelector] = useState(false);

  // Chat session state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatSessions, setChatSessions] = useState([]);
  const [docsLocked, setDocsLocked] = useState(false);
  const [lockedDocIds, setLockedDocIds] = useState([]);

  const allDocuments = classroom?.documents?.filter((d) => d.status === 'READY') || [];
  const selectedDocuments = allDocuments.filter((d) => selectedDocIds.includes(d.id));

  // Open tabs are tracked via the `tabs` query param (comma-separated doc ids).
  // The active tab always equals the path :docId; we ensure it's present in
  // the list and dedupe/cap to MAX_OPEN_TABS.
  const tabsParam = searchParams.get('tabs');
  const openTabIds = useMemo(() => {
    const fromUrl = tabsParam ? tabsParam.split(',').filter(Boolean) : [];
    const deduped = [];
    for (const id of fromUrl) {
      if (!deduped.includes(id)) deduped.push(id);
    }
    if (!deduped.includes(docId)) deduped.unshift(docId);
    return deduped.slice(0, MAX_OPEN_TABS);
  }, [tabsParam, docId]);

  // If the URL got out of sync (e.g. landed without ?tabs= or with stale ids),
  // normalize it. replace:true so we don't pollute history.
  useEffect(() => {
    const desired = openTabIds.join(',');
    if (tabsParam !== desired) {
      const next = new URLSearchParams(searchParams);
      next.set('tabs', desired);
      setSearchParams(next, { replace: true });
    }
  }, [openTabIds, tabsParam, searchParams, setSearchParams]);

  // Tab metadata pulled from the classroom doc list (which already has names).
  const tabDocuments = openTabIds
    .map((id) => allDocuments.find((d) => d.id === id))
    .filter(Boolean);
  const availableTabDocs = allDocuments.filter((d) => !openTabIds.includes(d.id));

  const navigateToDoc = (id, tabIds) => {
    navigate(`/classrooms/${classroomId}/documents/${id}?tabs=${tabIds.join(',')}`);
  };

  const handleSelectTab = (id) => {
    if (id === docId) return;
    navigateToDoc(id, openTabIds);
  };

  const handleAddTab = (id) => {
    if (openTabIds.includes(id) || openTabIds.length >= MAX_OPEN_TABS) return;
    navigateToDoc(id, [...openTabIds, id]);
  };

  const handleCloseTab = (id) => {
    const remaining = openTabIds.filter((t) => t !== id);
    if (remaining.length === 0) {
      navigate(`/classrooms/${classroomId}/documents`);
      return;
    }

    // Figure out what becomes the active doc so we can keep chat context valid.
    let nextActive = docId;
    if (id === docId) {
      const idx = openTabIds.indexOf(id);
      nextActive = remaining[Math.max(idx - 1, 0)];
    }

    // Prune the closed doc from chat context + locks. If pruning empties
    // selectedDocIds, fall back to whatever the new active tab is so the
    // chat panel always has at least one doc as context.
    setSelectedDocIds((prev) => {
      const pruned = prev.filter((d) => d !== id);
      return pruned.length > 0 ? pruned : [nextActive];
    });
    setLockedDocIds((prev) => prev.filter((d) => d !== id));

    if (id === docId) {
      navigateToDoc(nextActive, remaining);
    } else {
      const next = new URLSearchParams(searchParams);
      next.set('tabs', remaining.join(','));
      setSearchParams(next, { replace: true });
    }
  };

  // Initial chat state — runs once for the doc the user lands on. Subsequent
  // tab switches keep the existing chat session/locks so a mid-conversation
  // student can flip between tabs without losing context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedDocIds([docId]);
  }, []);

  // Fetch the document whenever the active tab changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDocument();
  }, [docId]);

  // Fetch chat sessions when chat tab is active
  const fetchChatSessions = useCallback(async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/chat/sessions?limit=10`);
      setChatSessions(response.data.data.sessions);
    } catch {
      // Silently fail
    }
  }, [classroomId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatSessions();
    }
  }, [activeTab, fetchChatSessions]);

  // Track container width for PDF auto-fit
  useEffect(() => {
    if (!pdfContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Subtract padding (8px on each side)
        const width = entry.contentRect.width - 16;
        setContainerWidth(width > 0 ? width : null);
      }
    });

    resizeObserver.observe(pdfContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [pdfUrl]); // Re-attach when PDF loads

  const isCodeDoc = (doc) => isCodeFileByName(doc?.originalName);
  const isNotebookDoc = (doc) => isNotebookFileByName(doc?.originalName);

  // Per-doc cache so flipping between tabs doesn't re-hit the API + S3.
  // Presigned PDF URLs typically live ~1h, so we time-box cache entries to be safe.
  const docCacheRef = useRef(new Map());
  const DOC_CACHE_TTL_MS = 30 * 60 * 1000;

  const applyDocState = (entry) => {
    setDocument(entry.document);
    setContent(entry.content || '');
    setCodeContent(entry.codeContent || null);
    setPdfUrl(entry.pdfUrl || null);
  };

  const fetchDocument = async () => {
    const cached = docCacheRef.current.get(docId);
    if (cached && Date.now() - cached.timestamp < DOC_CACHE_TTL_MS) {
      applyDocState(cached);
      setError('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Reset stale state from a different doc while the new one loads.
      setPdfUrl(null);
      setCodeContent(null);
      setContent('');

      const response = await api.get(`/documents/${docId}`);
      const doc = response.data.data.document;
      const entry = { document: doc, content: '', codeContent: null, pdfUrl: null, timestamp: Date.now() };

      if (doc.mimeType === 'application/pdf') {
        const downloadResponse = await api.get(`/documents/${docId}/download`);
        entry.pdfUrl = downloadResponse.data.data.url;
      } else if (isCodeDoc(doc) || isNotebookDoc(doc)) {
        const downloadResponse = await api.get(`/documents/${docId}/download`);
        entry.codeContent = await fetch(downloadResponse.data.data.url).then((r) => r.text());
      } else {
        entry.content = doc.chunks?.map((c) => c.content).join('\n\n') || '';
      }

      docCacheRef.current.set(docId, entry);
      applyDocState(entry);
      setError('');
    } catch {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const toggleDocSelection = (id) => {
    if (docsLocked && lockedDocIds.includes(id)) return;
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow deselecting the current document
        if (id === docId) return prev;
        return prev.filter((d) => d !== id);
      }
      return [...prev, id];
    });
  };

  const handleSessionChange = (newSessionId) => {
    setActiveSessionId(newSessionId);
    if (newSessionId) {
      fetchChatSessions();
    }
    if (!newSessionId) {
      setDocsLocked(false);
      setLockedDocIds([]);
      setSelectedDocIds([docId]);
    }
  };

  const handleDocumentsLocked = () => {
    setDocsLocked(true);
    setLockedDocIds([...selectedDocIds]);
  };

  const handleSelectChatSession = (session) => {
    setActiveSessionId(session.id);
    const sessionDocIds = session.documents.map((d) => d.id);
    // Always include current doc
    const merged = [...new Set([docId, ...sessionDocIds])];
    setSelectedDocIds(merged);
    setLockedDocIds(sessionDocIds);
    setDocsLocked(true);
  };

  const tabs = [
    { id: 'chat', label: t('documentViewer.chat') },
    { id: 'flashcards', label: t('documentViewer.cards') },
    { id: 'quizzes', label: t('documentViewer.quiz') },
    { id: 'summaries', label: t('documentViewer.summary') },
  ];

  return (
    <div className="flex gap-2 h-[calc(100vh-9rem)]">
      {/* Notes Panel (Left) */}
      {notesOpen && (
        <div className="w-80 min-w-48 flex flex-col bg-white rounded-lg shadow overflow-hidden" style={{ resize: 'horizontal' }}>
          <NotesPanel
            classroomId={classroomId}
            documentId={docId}
            compact
          />
        </div>
      )}

      {/* Document Viewer (Center) */}
      <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden">
        {/* Document Header */}
        <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center gap-2 bg-gray-50 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              to={`/classrooms/${classroomId}/documents`}
              className="flex-shrink-0 h-7 px-2 rounded-full text-xs font-medium text-gray-600 bg-gray-200 border border-gray-300 hover:bg-gray-300 inline-flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('common.back')}
            </Link>
            {/* Notes toggle - with label */}
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              className={`flex-shrink-0 h-7 px-2 rounded-full text-xs font-medium flex items-center gap-1 ${
                notesOpen
                  ? 'text-blue-700 bg-blue-100'
                  : 'text-gray-600 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('documentViewer.notes')}
            </button>
            <DocumentTabs
              tabs={tabDocuments}
              activeId={docId}
              availableDocs={availableTabDocs}
              maxReached={openTabIds.length >= MAX_OPEN_TABS}
              onSelect={handleSelectTab}
              onAdd={handleAddTab}
              onClose={handleCloseTab}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {document?.mimeType === 'application/pdf' && numPages && (
              <>
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                  title={t('documentViewer.zoomOut')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.25, 2.5))}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                  title={t('documentViewer.zoomIn')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="mx-0.5 h-6 w-1 rounded-full bg-gray-300" aria-hidden="true"></span>
              </>
            )}
            {/* Tools sidebar toggle - with label */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`h-7 px-2 rounded-full text-xs font-medium flex items-center gap-1 ${
                sidebarOpen
                  ? 'text-blue-700 bg-blue-100'
                  : 'text-gray-600 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {t('documentViewer.tools')}
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div ref={pdfContainerRef} className="flex-1 overflow-auto bg-white p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('documentViewer.loadingDocument')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Link to={`/classrooms/${classroomId}`} className="text-blue-600 hover:text-blue-800">
                  {t('documentViewer.backToClassroom')}
                </Link>
              </div>
            </div>
          ) : document?.mimeType === 'application/pdf' && pdfUrl ? (
            <div className="flex flex-col items-center">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }
                error={
                  <div className="text-red-600 text-center p-4">
                    {t('documentViewer.failedToLoadPdf')} <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('documentViewer.openInNewTab')}</a>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth ? Math.min(containerWidth, 900) * scale : undefined}
                  className="shadow-lg pdf-focus-halo"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {/* PDF Navigation */}
              {numPages && (
                <div className="flex items-center gap-3 mt-2 bg-white rounded-lg shadow px-3 py-1.5">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="p-1 rounded-full text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600">
                    {t('documentViewer.pageOf', { current: pageNumber, total: numPages })}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1 rounded-full text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : isNotebookDoc(document) && codeContent ? (
            <div className="max-w-5xl mx-auto w-full">
              <IpynbViewer rawContent={codeContent} filename={document?.originalName} />
            </div>
          ) : isCodeDoc(document) && codeContent ? (
            <div className="max-w-5xl mx-auto w-full">
              <CodeViewer code={codeContent} filename={document?.originalName} />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{content}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-96 min-w-48 flex flex-col bg-white rounded-lg shadow overflow-hidden" style={{ resize: 'horizontal', direction: 'rtl' }}>
         <div className="flex flex-col flex-1 overflow-hidden" style={{ direction: 'ltr' }}>
          {/* Sidebar Tabs */}
          <div className="flex p-1 m-1.5 rounded-lg" style={{ backgroundColor: 'var(--input-bg)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${
                  activeTab === tab.id
                    ? 'shadow-sm'
                    : 'hover:opacity-80'
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: 'var(--card-bg)', color: 'var(--accent)', border: 'none' }
                    : { color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Session dropdown for chat tab */}
          {activeTab === 'chat' && (
            <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50">
              <select
                value={activeSessionId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    handleSessionChange(null);
                  } else {
                    const session = chatSessions.find((s) => s.id === val);
                    if (session) handleSelectChatSession(session);
                  }
                }}
                className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{t('chatSessions.newChat')}</option>
                {chatSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || t('chatSessions.untitled')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Document Context Selector */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {t('documentViewer.docsAsContext', { count: selectedDocIds.length })}
              </span>
              {allDocuments.length > 1 && (
                <button
                  onClick={() => setShowDocSelector(!showDocSelector)}
                  className="text-xs text-blue-600 hover:text-blue-800 rounded-full font-medium"
                >
                  {showDocSelector ? t('documentViewer.hide') : t('documentViewer.addMore')}
                </button>
              )}
            </div>

            {/* Document selector dropdown */}
            {showDocSelector && allDocuments.length > 1 && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {allDocuments.map((doc) => {
                  const isLocked = doc.id === docId || (docsLocked && lockedDocIds.includes(doc.id));
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer ${
                        isLocked ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                        disabled={isLocked}
                        className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="truncate text-gray-700" title={doc.originalName}>
                        {doc.originalName}
                        {doc.id === docId && ` ${t('documentViewer.current')}`}
                        {docsLocked && lockedDocIds.includes(doc.id) && doc.id !== docId && (
                          <span className="ml-1 text-gray-400">({t('chatSessions.docsLocked')})</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected docs preview */}
            {selectedDocIds.length > 1 && !showDocSelector && (
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedDocuments.slice(0, 3).map((doc) => (
                  <span
                    key={doc.id}
                    className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                    title={doc.originalName}
                  >
                    {doc.originalName}
                  </span>
                ))}
                {selectedDocuments.length > 3 && (
                  <span className="text-xs text-gray-500">+{selectedDocuments.length - 3} more</span>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <ChatPanel
                classroomId={classroomId}
                documentIds={selectedDocIds}
                selectedDocuments={selectedDocuments}
                hasReadyDocuments={true}
                compact
                sessionId={activeSessionId}
                onSessionChange={handleSessionChange}
                onDocumentsLocked={handleDocumentsLocked}
              />
            )}
            {activeTab === 'flashcards' && (
              <FlashcardsPanel
                classroomId={classroomId}
                documents={allDocuments}
                initialDocumentIds={selectedDocIds}
                compact
              />
            )}
            {activeTab === 'quizzes' && (
              <QuizPanel
                classroomId={classroomId}
                documents={allDocuments}
                initialDocumentIds={selectedDocIds}
                compact
              />
            )}
            {activeTab === 'summaries' && (
              <SummaryPanel
                classroomId={classroomId}
                documents={allDocuments}
                initialDocumentIds={selectedDocIds}
                compact
              />
            )}
          </div>
         </div>
        </div>
      )}
    </div>
  );
}
