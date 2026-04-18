import { useState, useEffect, useRef } from 'react';
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

  // Audio note state
  const audioFileInputRef = useRef(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioStreamUrl, setAudioStreamUrl] = useState(null);

  const isAudioNote = (note) =>
    !!(note && note.mimeType && note.mimeType.startsWith('audio/'));

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
      const note = response.data.data.note;
      setActiveNote(note);
      setIsEditing(false);
      setIsCreating(false);
      setAudioStreamUrl(null);

      if (isAudioNote(note)) {
        try {
          const streamRes = await api.get(`/notes/${noteId}/stream`);
          setAudioStreamUrl(streamRes.data.data.url);
        } catch {
          setError(t('notesPanel.failedToLoadNote'));
        }
      }
    } catch {
      setError(t('notesPanel.failedToLoadNote'));
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError(t('notesPanel.invalidAudioFile'));
      return;
    }

    setUploadingAudio(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      if (documentId) formData.append('documentId', documentId);

      const response = await api.post(
        `/classrooms/${classroomId}/notes/audio`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const newNote = response.data.data.note;
      setNotes((prev) => [newNote, ...prev]);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('notesPanel.failedToUploadAudio'));
    } finally {
      setUploadingAudio(false);
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
        <div className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} border-b border-gray-200`}>
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
        <div className={`${compact ? 'px-3 py-1.5' : 'px-6 py-3'} border-b border-gray-200 flex justify-between items-center bg-gray-50`}>
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
          <div className={`${compact ? 'mx-3 mt-2 px-2 py-1.5 text-xs' : 'mx-6 mt-4 px-4 py-3 text-sm'} bg-red-50 border border-red-200 text-red-600 rounded`}>
            {error}
          </div>
        )}

        {/* Editor / Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showPreview ? (
            /* Preview mode */
            <div className={`flex-1 ${compact ? 'p-3' : 'p-6'} overflow-auto`}>
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
              className={`flex-1 ${compact ? 'p-3' : 'p-6'} resize-none border-none focus:outline-none focus:ring-0 text-sm`}
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
        <div className={`${compact ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-200 flex justify-between items-center`}>
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
                ...(isAudioNote(activeNote)
                  ? []
                  : [
                      {
                        label: t('common.edit'),
                        icon: (
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        ),
                        onClick: startEditing,
                      },
                    ]),
                ...(isAudioNote(activeNote)
                  ? []
                  : [
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
                    ]),
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

        <div className={`flex-1 ${compact ? 'p-4' : 'p-6'} overflow-auto`}>
          {isAudioNote(activeNote) ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8m-4-7a3 3 0 01-3-3V6a3 3 0 116 0v5a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium text-center mb-1 max-w-md truncate">
                {activeNote.originalName || activeNote.title}
              </p>
              {audioStreamUrl ? (
                <audio controls src={audioStreamUrl} className="w-full max-w-md mt-4" preload="metadata" />
              ) : (
                <p className="text-gray-400 text-sm mt-4">{t('notesPanel.loadingAudio')}</p>
              )}
            </div>
          ) : activeNote.content ? (
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
      <div className={`${compact ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-200 flex justify-between items-center`}>
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('notesPanel.title')}</h3>
          <p className="text-xs text-gray-500">{t('notesPanel.noteCount', { count: notes.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioUpload}
          />
          <div className="relative group">
            <button
              type="button"
              disabled={uploadingAudio}
              className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 dark:hover:bg-blue-500/80 inline-flex items-center justify-center disabled:opacity-50"
            >
              {t('notesPanel.newNote')}
            </button>
            <div
              className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border overflow-hidden opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-150"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
            >
              <button
                type="button"
                onClick={startCreating}
                className="group/item w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 border-0 outline-none focus:outline-none hover:bg-blue-500/10 dark:hover:bg-blue-400/15 hover:pl-4 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150"
                style={{ color: 'var(--text-primary)', background: 'transparent' }}
              >
                <svg className="h-4 w-4 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('notesPanel.textNote')}
              </button>
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                disabled={uploadingAudio}
                className="group/item w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 border-0 outline-none focus:outline-none hover:bg-blue-500/10 dark:hover:bg-blue-400/15 hover:pl-4 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:hover:pl-3 transition-all duration-150"
                style={{ color: 'var(--text-primary)', background: 'transparent' }}
              >
                <svg className="h-4 w-4 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8m-4-7a3 3 0 01-3-3V6a3 3 0 116 0v5a3 3 0 01-3 3z" />
                </svg>
                {uploadingAudio ? t('notesPanel.uploadingAudio') : t('notesPanel.audioNote')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {uploadingAudio && (
        <div className="h-1 w-full overflow-hidden bg-blue-100 dark:bg-blue-900/40">
          <div className="h-full w-1/3 bg-blue-600 animate-[indeterminate_1.2s_ease-in-out_infinite]" style={{ animation: 'indeterminate 1.2s ease-in-out infinite' }}></div>
          <style>{`@keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
        </div>
      )}

      {error && (
        <div className={`${compact ? 'mx-4 mt-2 px-3 py-2' : 'mx-6 mt-4 px-4 py-3'} bg-red-50 border border-red-200 text-red-600 rounded text-sm`}>
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
              className={`${compact ? 'px-4 py-3' : 'px-6 py-4'} notes-entry-divider cursor-pointer transition-colors`}
              onClick={() => openNote(note.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isAudioNote(note) ? (
                      <svg className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8m-4-7a3 3 0 01-3-3V6a3 3 0 116 0v5a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="truncate">{note.title}</span>
                  </p>
                  <p
                    className="mt-1 text-xs truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('notesPanel.updated', { date: formatDate(note.updatedAt) })}
                    {note.document && (
                      <span className="ml-2 inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h6l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2zm6 1v4h4" />
                        </svg>
                        {t('notesPanel.linkedTo', { name: note.document.originalName })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
