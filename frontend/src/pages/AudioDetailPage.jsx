import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function AudioDetailPage() {
  const { id: classroomId, docId } = useParams();
  const { classroom } = useOutletContext();
  const { t } = useTranslation();

  useStudyTracker(classroomId, 'DOCUMENT', docId);

  const [document, setDocument] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [docId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, streamRes] = await Promise.all([
        api.get(`/documents/${docId}`),
        api.get(`/documents/${docId}/stream`),
      ]);
      setDocument(docRes.data.data.document);
      setAudioUrl(streamRes.data.data.url);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setError(t('audioDetail.notFound'));
      } else {
        setError(t('audioDetail.failedToLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    try {
      setReprocessing(true);
      await api.post(`/documents/${docId}/reprocess`);
      await fetchData();
    } catch {
      setError(t('audioDetail.failedToLoad'));
    } finally {
      setReprocessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('audioDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to={`/classrooms/${classroomId}/documents`} className="text-blue-600 hover:text-blue-800">
            {t('audioDetail.backToDocuments')}
          </Link>
        </div>
      </div>
    );
  }

  const transcription = document?.chunks?.map((c) => c.content).join('\n\n') || '';
  const hasTranscription = transcription.trim().length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-2">
      {/* Header */}
      <div className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/classrooms/${classroomId}/documents`}
            className="px-2 py-1 rounded text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 flex-shrink-0"
          >
            {t('common.back')}
          </Link>
          <svg className="h-5 w-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 14.5v-1M12 15.5v-3M14.5 14.5v-1" />
          </svg>
          <h2 className="font-medium text-gray-900 truncate text-sm">{document?.originalName}</h2>
        </div>
        {document?.status === 'FAILED' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              {t('audioDetail.transcriptionFailed')}
            </span>
            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="px-3 py-1 text-xs font-medium rounded-full bg-transparent text-yellow-800 hover:bg-yellow-100 disabled:opacity-50"
            >
              {reprocessing ? t('audioDetail.retrying') : t('audioDetail.retry')}
            </button>
          </div>
        )}
        {document?.status === 'PENDING' && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
            {t('audioDetail.transcriptionPending')}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Left: Audio player */}
        <div className="w-1/2 bg-white rounded-lg shadow flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">{t('audioDetail.audioPlayer')}</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Large audio icon */}
            <div className="w-32 h-32 rounded-full bg-purple-50 flex items-center justify-center mb-6">
              <svg className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.5 14.5v-1M12 15.5v-3M14.5 14.5v-1" />
              </svg>
            </div>

            <p className="text-gray-900 font-medium text-center mb-1 max-w-md truncate">
              {document?.originalName}
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {formatFileSize(document?.size)}
            </p>

            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full max-w-md" preload="metadata">
                {t('classroomDocuments.audioNotSupported')}
              </audio>
            ) : (
              <p className="text-gray-400 text-sm">{t('audioDetail.audioUnavailable')}</p>
            )}
          </div>
        </div>

        {/* Right: Transcription */}
        <div className="w-1/2 bg-white rounded-lg shadow flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">{t('audioDetail.transcription')}</h3>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {hasTranscription ? (
              <MarkdownRenderer>{transcription}</MarkdownRenderer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">
                  {document?.status === 'FAILED'
                    ? t('audioDetail.transcriptionFailedHint')
                    : document?.status === 'READY'
                    ? t('audioDetail.noTranscription')
                    : t('audioDetail.transcriptionPending')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
