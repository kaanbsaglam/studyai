import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import ClassroomStudyStats from '../components/stats/ClassroomStudyStats';
import ClassroomStats from '../components/ClassroomMaterialsSummary';

export default function ClassroomDashboard() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { classroom, refreshClassroom } = useOutletContext();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  // Auto-refresh when documents are processing
  useEffect(() => {
    const hasProcessing = classroom?.documents?.some(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    );

    if (hasProcessing) {
      const interval = setInterval(refreshClassroom, 3000);
      return () => clearInterval(interval);
    }
  }, [classroom?.documents]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'audio/mpeg', // .mp3
      'audio/wav',
      'audio/x-wav',
      'audio/mp4', // .m4a
      'audio/x-m4a',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(t('classroomDashboard.invalidFileType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('classroomDashboard.fileTooLarge'));
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
    } catch (err) {
      setError(err.response?.data?.error?.message || t('classroomDashboard.failedToUpload'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm(t('classroomDashboard.deleteDocConfirm'))) {
      return;
    }

    try {
      await api.delete(`/documents/${docId}`);
      await refreshClassroom();
    } catch (err) {
      setError(t('classroomDashboard.failedToDeleteDoc'));
    }
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

  const getDocTimestamp = (doc) => {
    const rawDate = doc.createdAt || doc.updatedAt;
    if (!rawDate) return 0;
    const timestamp = new Date(rawDate).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const recentDocuments = [...(classroom?.documents || [])]
    .sort((a, b) => getDocTimestamp(b) - getDocTimestamp(a))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Material Counts */}
      <ClassroomStats counts={classroom?._count} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4">
        <ClassroomStudyStats classroomId={id} />
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('classroomDashboard.recentDocuments')}</h3>
            <p className="text-sm text-gray-500">{t('classroomDashboard.showingLatest')}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.mp3,.wav,.m4a,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/mpeg,audio/wav,audio/mp4"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 inline-block ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? t('classroomDashboard.uploading', { progress: uploadProgress }) : t('classroomDashboard.uploadDocument')}
            </label>
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

        {recentDocuments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2">{t('classroomDashboard.noDocumentsYet')}</p>
            <p className="text-sm">{t('classroomDashboard.uploadFromDocuments')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentDocuments.map((doc) => (
              <li key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <Link
                  to={doc.status === 'READY' ? `/classrooms/${id}/documents/${doc.id}` : '#'}
                  className={`flex items-center gap-3 flex-1 ${doc.status !== 'READY' ? 'pointer-events-none' : ''}`}
                >
                  <svg
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{doc.originalName}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  {getStatusBadge(doc.status)}
                  {doc.status === 'PROCESSING' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  {doc.status === 'READY' && (
                    <Link
                      to={`/classrooms/${id}/documents/${doc.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {t('common.open')}
                    </Link>
                  )}
                  <span
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-sm text-red-600 hover:text-red-800 cursor-pointer font-semibold"
                  >
                    {t('common.delete')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
