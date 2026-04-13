import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import api from '../api/axios';

function isAudioMime(mimeType) {
  return mimeType?.startsWith('audio/');
}

export default function ClassroomDocumentsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { classroom, refreshClassroom } = useOutletContext();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('documents');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [semanticResults, setSemanticResults] = useState(null); // null = no search, [] = no results
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbortRef = useRef(null);

  // Auto-select audio tab on first load when there are only audio files
  useEffect(() => {
    if (!tabInitialized && classroom?.documents?.length > 0) {
      const hasDocFiles = classroom.documents.some((d) => !isAudioMime(d.mimeType));
      const hasAudioFiles = classroom.documents.some((d) => isAudioMime(d.mimeType));
      if (!hasDocFiles && hasAudioFiles) {
        setActiveTab('audio');
      }
      setTabInitialized(true);
    }
  }, [classroom?.documents, tabInitialized]);

  // Auto-refresh when documents are processing
  useEffect(() => {
    const hasProcessing = classroom?.documents?.some(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    );

    if (hasProcessing) {
      const interval = setInterval(refreshClassroom, 3000);
      return () => clearInterval(interval);
    }
  }, [classroom?.documents, refreshClassroom]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/x-m4a',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(t('classroomDocuments.invalidFileType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('classroomDocuments.fileTooLarge'));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/classrooms/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      await refreshClassroom();

      // Auto-switch to audio tab if an audio file was uploaded
      if (file.type.startsWith('audio/')) {
        setActiveTab('audio');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || t('classroomDocuments.failedToUpload'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm(t('classroomDocuments.deleteConfirm'))) {
      return;
    }

    try {
      await api.delete(`/documents/${docId}`);
      await refreshClassroom();
    } catch (err) {
      setError(t('classroomDocuments.failedToDelete'));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      READY: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    const labels = {
      PENDING: t('statusBadge.pending'),
      PROCESSING: t('statusBadge.processing'),
      READY: t('statusBadge.ready'),
      FAILED: t('statusBadge.failed'),
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const allDocuments = classroom?.documents || [];

  const documentFiles = useMemo(
    () => allDocuments.filter((doc) => !isAudioMime(doc.mimeType)),
    [allDocuments]
  );
  const audioFiles = useMemo(
    () => allDocuments.filter((doc) => isAudioMime(doc.mimeType)),
    [allDocuments]
  );

  const currentList = activeTab === 'documents' ? documentFiles : audioFiles;

  // Debounced semantic search
  useEffect(() => {
    const trimmed = searchQuery.trim();

    // Clear semantic results when query is too short
    if (trimmed.length < 3) {
      setSemanticResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const timer = setTimeout(async () => {
      // Abort previous request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const res = await api.get(`/classrooms/${id}/documents/search`, {
          params: { q: trimmed },
          signal: controller.signal,
        });
        setSemanticResults(res.data.data.results);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          setSemanticResults(null);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, id]);

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return currentList;

    // Title matches (instant, client-side)
    const titleMatches = currentList.filter((doc) =>
      doc.originalName?.toLowerCase().includes(normalized)
    );

    // If no semantic results yet, return title matches only
    if (!semanticResults || semanticResults.length === 0) {
      return titleMatches;
    }

    // Build a score map from semantic results
    const semanticScoreMap = new Map(
      semanticResults.map((r) => [r.documentId, r.score])
    );

    // Merge: title matches first, then semantic-only matches
    const titleMatchIds = new Set(titleMatches.map((d) => d.id));
    const semanticOnly = currentList.filter(
      (doc) => semanticScoreMap.has(doc.id) && !titleMatchIds.has(doc.id)
    );

    // Sort semantic-only by score descending
    semanticOnly.sort((a, b) =>
      (semanticScoreMap.get(b.id) || 0) - (semanticScoreMap.get(a.id) || 0)
    );

    return [...titleMatches, ...semanticOnly];
  }, [currentList, searchQuery, semanticResults]);

  const acceptTypes =
    activeTab === 'audio'
      ? '.mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4'
      : '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-transparent flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('classroomDocuments.title')}</h3>
            <p className="text-sm text-gray-500">{t('classroomDocuments.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('classroomDocuments.searchDocuments')}
                aria-busy={searchLoading}
                className={`w-64 px-3 py-2 pr-8 border rounded-full text-sm transition-colors duration-200 focus:outline-none ${
                  searchLoading
                    ? 'search-input-loading border-search-loading focus:ring-0 focus:border-search-loading'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {searchLoading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                  <span className="search-spinner"/>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-blue-700 inline-block ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading
                ? t('classroomDocuments.uploading', { progress: uploadProgress })
                : activeTab === 'audio'
                ? t('classroomDocuments.uploadAudio')
                : t('classroomDocuments.uploadDocument')}
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3">
          <div className="flex rounded-xl p-1 w-full" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => { setActiveTab('documents'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'documents' ? 'shadow-md' : ''
              }`}
              style={activeTab === 'documents'
                ? { backgroundColor: 'var(--card-bg)', color: 'var(--accent)', border: 'none' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none' }
              }
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('classroomDocuments.documentsTab')} ({documentFiles.length})
            </button>
            <button
              onClick={() => { setActiveTab('audio'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'audio' ? 'shadow-md' : ''
              }`}
              style={activeTab === 'audio'
                ? { backgroundColor: 'var(--card-bg)', color: 'var(--accent)', border: 'none' }
                : { color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none' }
              }
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-2.464a5 5 0 010-7.072M6.343 5.657a9 9 0 000 12.686M17.657 5.657a9 9 0 010 12.686" />
              </svg>
              {t('classroomDocuments.audioTab')} ({audioFiles.length})
            </button>
          </div>
        </div>

        {uploading && (
          <div className="px-6 py-2 bg-blue-50">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'documents' ? (
          <DocumentList
            documents={filteredItems}
            allEmpty={documentFiles.length === 0}
            id={id}
            t={t}
            formatFileSize={formatFileSize}
            getStatusBadge={getStatusBadge}
            onDelete={handleDeleteDocument}
          />
        ) : (
          <AudioList
            audioFiles={filteredItems}
            allEmpty={audioFiles.length === 0}
            id={id}
            t={t}
            formatFileSize={formatFileSize}
            getStatusBadge={getStatusBadge}
            onDelete={handleDeleteDocument}
          />
        )}
      </div>
    </div>
  );
}

/* ── Document list (non-audio) ────────────────────────── */
function DocumentList({ documents, allEmpty, id, t, formatFileSize, getStatusBadge, onDelete }) {
  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2">
          {allEmpty ? t('classroomDocuments.noDocumentsYet') : t('classroomDocuments.noDocumentsMatch')}
        </p>
        {allEmpty && <p className="text-sm">{t('classroomDocuments.uploadHint')}</p>}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-transparent">
      {documents.map((doc) => (
        <li key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
          <Link
            to={doc.status === 'READY' ? `/classrooms/${id}/documents/${doc.id}` : '#'}
            className={`flex items-center gap-3 flex-1 ${doc.status !== 'READY' ? 'pointer-events-none' : ''}`}
          >
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">{doc.originalName}</p>
              <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {getStatusBadge(doc.status)}
            {doc.status === 'PROCESSING' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {doc.status === 'READY' && (
              <Link
                to={`/classrooms/${id}/documents/${doc.id}`}
                className="link-btn"
              >
                {t('common.open')}
              </Link>
            )}
            <button onClick={() => onDelete(doc.id)} className="link-btn text-red-600 hover:text-red-800">
              {t('common.delete')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Audio list ───────────────────────────────────────── */
function AudioList({
  audioFiles,
  allEmpty,
  id,
  t,
  formatFileSize,
  getStatusBadge,
  onDelete,
}) {
  if (audioFiles.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-2.464a5 5 0 010-7.072M6.343 5.657a9 9 0 000 12.686M17.657 5.657a9 9 0 010 12.686" />
        </svg>
        <p className="mt-2">
          {allEmpty ? t('classroomDocuments.noAudioYet') : t('classroomDocuments.noDocumentsMatch')}
        </p>
        {allEmpty && <p className="text-sm">{t('classroomDocuments.uploadAudioHint')}</p>}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-transparent">
      {audioFiles.map((doc) => (
        <AudioItem
          key={doc.id}
          doc={doc}
          id={id}
          t={t}
          formatFileSize={formatFileSize}
          getStatusBadge={getStatusBadge}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function AudioItem({ doc, id, t, formatFileSize, getStatusBadge, onDelete }) {
  const isProcessing = doc.status === 'PENDING' || doc.status === 'PROCESSING';

  return (
    <li className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <Link
          to={isProcessing ? '#' : `/classrooms/${id}/audio/${doc.id}`}
          className={`flex items-center gap-3 flex-1 min-w-0 ${isProcessing ? 'pointer-events-none' : ''}`}
        >
          <svg className="h-8 w-8 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 14.5v-1M12 15.5v-3M14.5 14.5v-1" />
          </svg>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
            <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 flex-shrink-0">
          {getStatusBadge(doc.status)}

          {isProcessing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}

          {!isProcessing && (
            <Link
              to={`/classrooms/${id}/audio/${doc.id}`}
              className="link-btn"
            >
              {t('common.open')}
            </Link>
          )}

          <button onClick={() => onDelete(doc.id)} className="link-btn text-red-600 hover:text-red-800">
            {t('common.delete')}
          </button>
        </div>
      </div>
    </li>
  );
}
