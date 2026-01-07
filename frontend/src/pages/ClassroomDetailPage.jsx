import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';

export default function ClassroomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchClassroom();
  }, [id]);

  // Auto-refresh when documents are processing
  useEffect(() => {
    const hasProcessing = classroom?.documents?.some(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    );

    if (hasProcessing) {
      const interval = setInterval(fetchClassroom, 3000);
      return () => clearInterval(interval);
    }
  }, [classroom?.documents]);

  const fetchClassroom = async () => {
    try {
      const response = await api.get(`/classrooms/${id}`);
      setClassroom(response.data.data.classroom);
      setEditName(response.data.data.classroom.name);
      setEditDescription(response.data.data.classroom.description || '');
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Classroom not found');
      } else {
        setError('Failed to load classroom');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await api.patch(`/classrooms/${id}`, {
        name: editName,
        description: editDescription || null,
      });
      setClassroom({
        ...response.data.data.classroom,
        documents: classroom.documents,
      });
      setIsEditing(false);
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

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: PDF, DOCX, TXT');
      return;
    }

    // Validate file size (10MB)
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      // Refresh classroom to get new document
      await fetchClassroom();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
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
      setClassroom({
        ...classroom,
        documents: classroom.documents.filter((d) => d.id !== docId),
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error && !classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/classrooms" className="text-blue-600 hover:text-blue-800">
            Back to Classrooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/classrooms" className="text-gray-500 hover:text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">StudyAI</h1>
            </div>
            <div className="flex items-center gap-4">
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/account"
                className={`text-sm px-3 py-1 rounded ${
                  user?.tier === 'PREMIUM'
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {user?.tier || 'FREE'}
              </Link>
              <span className="text-gray-600">{user?.name || user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Classroom header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xl font-semibold"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description (optional)"
              />
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
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{classroom.name}</h2>
                {classroom.description && (
                  <p className="mt-1 text-gray-500">{classroom.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Documents section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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

          {/* Upload progress bar */}
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
                <li key={doc.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(doc.status)}
                    {doc.status === 'PROCESSING' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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

        {/* Chat Panel */}
        <div className="mt-6">
          <ChatPanel
            classroomId={id}
            hasReadyDocuments={classroom.documents?.some((d) => d.status === 'READY')}
          />
        </div>
      </main>
    </div>
  );
}
