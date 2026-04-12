import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';
import api from '../api/axios';
import ThreeDotMenu from './ThreeDotMenu';
import NotesPdfDocument from './pdf/NotesPdfDocument';
import { downloadPdf, downloadTxt } from '../utils/exportHelpers';

export default function NotesPanel({
  classroomId,
  documentId = null,
  compact = false,
}) {
  const { t } = useTranslation();
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
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [classroomId]);

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/notes`);
      setNotes(response.data.data.notes);
      setError('');
    } catch {
      setError(t('notesPanel.failedToLoad'));
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
      setError(err.response?.data?.error?.message || t('notesPanel.failedToCreate'));
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
      setError(err.response?.data?.error?.message || t('notesPanel.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm(t('notesPanel.deleteConfirm'))) return;

    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeNote?.id === noteId) {
        setActiveNote(null);
        setIsEditing(false);
      }
    } catch {
      setError(t('notesPanel.failedToDelete'));
    }
  };

  const openNote = async (noteId) => {
    try {
      const response = await api.get(`/notes/${noteId}`);
      setActiveNote(response.data.data.note);
      setIsEditing(false);
      setIsCreating(false);
    } catch {
      setError(t('notesPanel.failedToLoadNote'));
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

  const handleExportNotePdf = async (note) => {
    await downloadPdf(
      <NotesPdfDocument note={note} />,
      note.title
    );
  };

  const handleExportNoteTxt = (note) => {
    downloadTxt(note.content || '', note.title);
  };

  // Edit/Create view
  if (isEditing) {
    return (
      <div className={compact ? 'flex flex-col h-full' : 'bg-white rounded-lg shadow flex flex-col h-full'}>
        {/* Header with title */}
        <div className="px-3 py-2 border-b border-gray-200">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={t('notesPanel.noteTitlePlaceholder')}
            className="w-full text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 px-0"
            autoFocus
          />
        </div>

        {/* Toolbar */}
        <div className="px-3 py-1.5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
              showPreview
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t('notesPanel.preview')}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={cancelEdit}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={isCreating ? handleCreateNote : handleUpdateNote}
              disabled={saving || !editTitle.trim()}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-500/80 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-3 mt-2 bg-red-50 border border-red-200 text-red-600 px-2 py-1.5 rounded text-xs">
            {error}
          </div>
        )}

        {/* Editor / Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showPreview ? (
            /* Preview mode */
            <div className="flex-1 p-3 overflow-auto">
              {editContent ? (
                <MarkdownRenderer>{editContent}</MarkdownRenderer>
              ) : (
                <p className="text-gray-400 italic text-sm">{t('notesPanel.nothingToPreview')}</p>
              )}
            </div>
          ) : (
            /* Editor mode */
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={t('notesPanel.writePlaceholder')}
              className="flex-1 p-3 resize-none border-none focus:outline-none focus:ring-0 text-sm"
            />
          )}
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
              {t('notesPanel.updated', { date: formatDate(activeNote.updatedAt) })}
              {activeNote.document && (
                <span className="ml-2">
                  - {t('notesPanel.linkedTo', { name: activeNote.document.originalName })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveNote(null)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
              title={t('notesPanel.backToList')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <ThreeDotMenu
              items={[
                {
                  label: t('common.edit'),
                  icon: (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ),
                  onClick: startEditing,
                },
                {
                  label: t('export.downloadPdf'),
                  icon: (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  onClick: () => handleExportNotePdf(activeNote),
                },
                {
                  label: t('export.downloadTxt'),
                  icon: (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  onClick: () => handleExportNoteTxt(activeNote),
                },
                {
                  label: t('common.delete'),
                  icon: (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                  onClick: () => handleDeleteNote(activeNote.id),
                  danger: true,
                },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {activeNote.content ? (
            <MarkdownRenderer>{activeNote.content}</MarkdownRenderer>
          ) : (
            <p className="text-gray-400 italic">{t('notesPanel.emptyNote')}</p>
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
          <h3 className="text-lg font-medium text-gray-900">{t('notesPanel.title')}</h3>
          <p className="text-xs text-gray-500">{t('notesPanel.noteCount', { count: notes.length })}</p>
        </div>
        <button
          onClick={startCreating}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-500/80"
        >
          {t('notesPanel.newNote')}
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
          <p className="mt-2 text-gray-500">{t('common.loading')}</p>
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
          <p className="mt-2">{t('notesPanel.noNotesYet')}</p>
          <p className="text-sm">{t('notesPanel.createHint')}</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-auto">
          {notes.map((note) => (
            <li
              key={note.id}
              className="px-4 py-3 cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid var(--card-border)' }}
              onClick={() => openNote(note.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{note.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(note.updatedAt)}
                    {note.document && (
                      <span className="ml-2" style={{ color: 'var(--accent)' }}>
                        {note.document.originalName}
                      </span>
                    )}
                  </p>
                  {note.content && (
                    <div className="mt-1.5 line-clamp-2 overflow-hidden note-preview-markdown" style={{ color: 'var(--text-secondary)', maxHeight: '2.8em' }}>
                      <MarkdownRenderer>{note.content.substring(0, 150)}</MarkdownRenderer>
                    </div>
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
