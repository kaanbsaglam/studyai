import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ClassroomStudyStats from '../components/stats/ClassroomStudyStats';

export default function ClassroomDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { classroom, refreshClassroom } = useOutletContext();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(classroom?.name || '');
  const [editDescription, setEditDescription] = useState(classroom?.description || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [flashcardCount, setFlashcardCount] = useState(0);

  useEffect(() => {
    setEditName(classroom?.name || '');
    setEditDescription(classroom?.description || '');
    fetchStats();
  }, [classroom]);

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

  const fetchStats = async () => {
    try {
      const response = await api.get(`/classrooms/${id}/flashcard-sets`);
      setFlashcardCount(response.data.data.flashcardSets.length);
    } catch (err) {
      // Ignore errors for stats
    }
  };

  const handleUpdate = async () => {
    try {
      await api.patch(`/classrooms/${id}`, {
        name: editName,
        description: editDescription || null,
      });
      await refreshClassroom();
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update classroom');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this classroom? All documents will be deleted.')) {
      return;
    }

    try {
      await api.delete(`/classrooms/${id}`);
      navigate('/classrooms');
    } catch (err) {
      setError('Failed to delete classroom');
    }
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
      setError('Invalid file type. Allowed: PDF, DOCX, TXT, MP3, WAV, M4A');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
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
      setError(err.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/documents/${docId}`);
      await refreshClassroom();
    } catch (err) {
      setError('Failed to delete document');
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
      PENDING: 'Pending',
      PROCESSING: 'Processing...',
      READY: 'Ready',
      FAILED: 'Failed',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const readyDocs = classroom?.documents?.filter((d) => d.status === 'READY') || [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Documents</div>
          <div className="text-2xl font-bold text-gray-900">
            {readyDocs.length}
            <span className="text-sm font-normal text-gray-500"> ready</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Flashcard Sets</div>
          <div className="text-2xl font-bold text-gray-900">{flashcardCount}</div>
        </div>
        <ClassroomStudyStats classroomId={id} />
      </div>

      {/* Classroom Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Classroom Settings</h3>
          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(classroom.name);
                  setEditDescription(classroom.description || '');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {classroom.description || 'No description'}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>
          <div>
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
              className={`px-4 py-2 bg-blue-600 text-white rounded-md font-medium cursor-pointer hover:bg-blue-700 inline-block ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? `Uploading... ${uploadProgress}%` : '+ Upload Document'}
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

        {classroom.documents?.length === 0 ? (
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
            <p className="mt-2">No documents yet</p>
            <p className="text-sm">Upload PDF, DOCX, or TXT files to start studying with AI</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {classroom.documents.map((doc) => (
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
                      Open
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
