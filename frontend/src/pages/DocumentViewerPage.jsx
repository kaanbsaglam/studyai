import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axios';
import ChatPanel from '../components/ChatPanel';
import FlashcardsPanel from '../components/FlashcardsPanel';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentViewerPage() {
  const { id: classroomId, docId } = useParams();
  const { classroom } = useOutletContext();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Document selection - current doc is pre-selected
  const [selectedDocIds, setSelectedDocIds] = useState([docId]);
  const [showDocSelector, setShowDocSelector] = useState(false);

  const allDocuments = classroom?.documents?.filter((d) => d.status === 'READY') || [];
  const selectedDocuments = allDocuments.filter((d) => selectedDocIds.includes(d.id));

  useEffect(() => {
    fetchDocument();
    // Pre-select current document when docId changes
    setSelectedDocIds([docId]);
  }, [docId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/documents/${docId}`);
      const doc = response.data.data.document;
      setDocument(doc);

      if (doc.mimeType === 'application/pdf') {
        // Get presigned URL for PDF
        const downloadResponse = await api.get(`/documents/${docId}/download`);
        setPdfUrl(downloadResponse.data.data.url);
      } else {
        // For text files, fetch content from chunks
        const chunksContent = doc.chunks?.map((c) => c.content).join('\n\n') || '';
        setContent(chunksContent);
      }

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
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow deselecting the current document
        if (id === docId) return prev;
        return prev.filter((d) => d !== id);
      }
      return [...prev, id];
    });
  };

  const tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'flashcards', label: 'Flashcards' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to={`/classrooms/${classroomId}`} className="text-blue-600 hover:text-blue-800">
            Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Document Viewer */}
      <div className={`flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden ${sidebarOpen ? '' : 'w-full'}`}>
        {/* Document Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-gray-900 truncate max-w-md">{document?.originalName}</h2>
          </div>
          <div className="flex items-center gap-2">
            {document?.mimeType === 'application/pdf' && numPages && (
              <>
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="Zoom out"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.25, 2.5))}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="Zoom in"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-gray-300 mx-2">|</span>
              </>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {document?.mimeType === 'application/pdf' && pdfUrl ? (
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
                    Failed to load PDF. <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {/* PDF Navigation */}
              {numPages && (
                <div className="flex items-center gap-4 mt-4 bg-white rounded-lg shadow px-4 py-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
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
        <div className="w-96 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Document Context Selector */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {selectedDocIds.length} doc{selectedDocIds.length !== 1 ? 's' : ''} as context
              </span>
              {allDocuments.length > 1 && (
                <button
                  onClick={() => setShowDocSelector(!showDocSelector)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showDocSelector ? 'Hide' : 'Add more'}
                </button>
              )}
            </div>

            {/* Document selector dropdown */}
            {showDocSelector && allDocuments.length > 1 && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {allDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer ${
                      doc.id === docId ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDocSelection(doc.id)}
                      disabled={doc.id === docId}
                      className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="truncate text-gray-700" title={doc.originalName}>
                      {doc.originalName}
                      {doc.id === docId && ' (current)'}
                    </span>
                  </label>
                ))}
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
          </div>
        </div>
      )}
    </div>
  );
}
