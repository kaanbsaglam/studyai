import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api/axios';

export default function NotesPanel({
  classroomId,
  documentId = null,
  compact = false,
}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [classroomId]);

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/notes`);
      setNotes(response.data.data.notes);
      setError('');
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!editTitle.trim()) return;

    setSaving(true);
    setError('');

    try {
      const response = await api.post(`/classrooms/${classroomId}/notes`, {
        title: editTitle.trim(),
        content: editContent,
        documentId: documentId || undefined,
      });

      setNotes((prev) => [response.data.data.note, ...prev]);
      setActiveNote(response.data.data.note);
      setIsCreating(false);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!activeNote || !editTitle.trim()) return;

    setSaving(true);
    setError('');

    try {
      const response = await api.patch(`/notes/${activeNote.id}`, {
        title: editTitle.trim(),
        content: editContent,
      });

      const updatedNote = response.data.data.note;
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
      );
      setActiveNote(updatedNote);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeNote?.id === noteId) {
        setActiveNote(null);
        setIsEditing(false);
      }
    } catch {
      setError('Failed to delete note');
    }
  };

  const openNote = async (noteId) => {
    try {
      const response = await api.get(`/notes/${noteId}`);
      setActiveNote(response.data.data.note);
      setIsEditing(false);
      setIsCreating(false);
    } catch {
      setError('Failed to load note');
    }
  };

  const startEditing = () => {
    setEditTitle(activeNote.title);
    setEditContent(activeNote.content);
    setIsEditing(true);
  };

  const startCreating = () => {
    setEditTitle('');
    setEditContent('');
    setIsCreating(true);
    setIsEditing(true);
    setActiveNote(null);
  };

  const cancelEdit = () => {
    if (isCreating) {
      setIsCreating(false);
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Edit/Create view
  if (isEditing) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow flex flex-col h-full'}>
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Note title..."
            className="flex-1 text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={isCreating ? handleCreateNote : handleUpdateNote}
              disabled={saving || !editTitle.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              Markdown
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your notes here... (supports markdown)"
              className="flex-1 p-4 resize-none border-none focus:outline-none focus:ring-0 font-mono text-sm"
            />
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              Preview
            </div>
            <div className="flex-1 p-4 overflow-auto prose prose-sm max-w-none">
              {editContent ? (
                <ReactMarkdown>{editContent}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">Preview will appear here...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View note (read-only)
  if (activeNote && !isEditing) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow flex flex-col h-full'}>
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">{activeNote.title}</h3>
            <p className="text-xs text-gray-500">
              Updated {formatDate(activeNote.updatedAt)}
              {activeNote.document && (
                <span className="ml-2">
                  - Linked to {activeNote.document.originalName}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveNote(null)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Back to list"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <button
              onClick={startEditing}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteNote(activeNote.id)}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto prose prose-sm max-w-none">
          {activeNote.content ? (
            <ReactMarkdown>{activeNote.content}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">This note is empty.</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  const containerClass = compact
    ? 'flex flex-col h-full'
    : 'bg-white rounded-lg shadow flex flex-col h-full';

  return (
    <div className={containerClass}>
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Notes</h3>
          <p className="text-xs text-gray-500">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={startCreating}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          + New Note
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <p className="mt-2">No notes yet</p>
          <p className="text-sm">Click &quot;+ New Note&quot; to create one</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 flex-1 overflow-auto">
          {notes.map((note) => (
            <li
              key={note.id}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => openNote(note.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{note.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(note.updatedAt)}
                    {note.document && (
                      <span className="ml-2 text-blue-600">
                        {note.document.originalName}
                      </span>
                    )}
                  </p>
                  {note.content && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {note.content.substring(0, 100)}
                      {note.content.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
