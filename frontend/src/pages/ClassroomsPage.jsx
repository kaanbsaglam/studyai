import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StudyStatsCard from '../components/stats/StudyStatsCard';
import ActivityHeatmap from '../components/stats/ActivityHeatmap';
import DayBreakdownModal from '../components/stats/DayBreakdownModal';
import TimerPill from '../components/timer/TimerPill';
import LanguageToggle from '../components/LanguageToggle';

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studyStats, setStudyStats] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    fetchClassrooms();
    fetchStudyStats();
  }, []);

  const fetchStudyStats = async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const response = await api.get(`/study-stats?tzOffset=${tzOffset}`);
      setStudyStats(response.data.data);
    } catch (err) {
      // Silently fail - stats are optional enhancement
      console.error('Failed to load study stats:', err);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await api.get('/classrooms');
      setClassrooms(response.data.data.classrooms);
    } catch (err) {
      setError(t('classrooms.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (name, description) => {
    try {
      const response = await api.post('/classrooms', { name, description });
      setClassrooms([response.data.data.classroom, ...classrooms]);
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteClassroom = async (id) => {
    if (!confirm(t('classrooms.deleteConfirm'))) {
      return;
    }

    try {
      await api.delete(`/classrooms/${id}`);
      setClassrooms(classrooms.filter((c) => c.id !== id));
    } catch (err) {
      setError(t('classrooms.failedToDelete'));
    }
  };

  const [editingClassroom, setEditingClassroom] = useState(null);

  const handleEditClassroom = async (id, name, description) => {
    try {
      await api.patch(`/classrooms/${id}`, { name, description: description || null });
      setClassrooms(classrooms.map((c) => c.id === id ? { ...c, name, description } : c));
      setEditingClassroom(null);
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{t('common.studyai')}</h1>
            </div>
            <div className="flex items-center gap-4">
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="link-btn"
                >
                  {t('common.admin')}
                </Link>
              )}
              <TimerPill />
              <LanguageToggle />
              <Link
                className={`link-btn ${
                  user?.tier === 'PREMIUM'
                    ? 'bg-purple-700 text-gray-700 hover:bg-purple-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {user?.tier || 'FREE'}
              </Link>
              <Link
                to="/settings"
                className="text-gray-500 hover:text-gray-700"
                title={t('common.settings')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <span className="text-gray-600">{user?.name || user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">{t('classrooms.myClassrooms')}</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            {t('classrooms.newClassroom')}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Study Stats Section */}
        {studyStats && (studyStats.todaySeconds > 0 || studyStats.weekSeconds > 0 || studyStats.dailyData?.length > 0) && (
          <div className="mb-6 space-y-4">
            <StudyStatsCard stats={studyStats} />
            {studyStats.dailyData?.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('classrooms.activity')}</h3>
                <ActivityHeatmap
                  dailyData={studyStats.dailyData}
                  weeks={12}
                  onDayClick={(date) => setSelectedDay(date)}
                />
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('classrooms.loadingClassrooms')}</p>
          </div>
        ) : classrooms.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 bg-white rounded-lg shadow">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">{t('classrooms.noClassroomsYet')}</h3>
            <p className="mt-1 text-gray-500">{t('classrooms.createFirst')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              {t('classrooms.newClassroom')}
            </button>
          </div>
        ) : (
          /* Classrooms grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <Link to={`/classrooms/${classroom.id}`} className="block p-6">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {classroom.name}
                  </h3>
                  {classroom.description && (
                    <p className="mt-1 text-gray-500 text-sm line-clamp-2">
                      {classroom.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <svg
                      className="h-4 w-4 mr-1"
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
                    {`${classroom._count?.documents || 0} ${t('common.documents')}`}
                  </div>
                </Link>
                <div className="px-6 pb-4 flex items-center gap-2">
                  <button
                    onClick={() => setEditingClassroom(classroom)}
                    className="text-gray-400 hover:text-gray-600 p-1 bg-transparent"
                    title={t('common.edit')}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClassroom(classroom.id)}
                    className="text-gray-400 hover:text-red-600 p-1 bg-transparent"
                    title={t('common.delete')}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClassroomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClassroom}
        />
      )}

      {/* Edit Classroom Modal */}
      {editingClassroom && (
        <EditClassroomModal
          classroom={editingClassroom}
          onClose={() => setEditingClassroom(null)}
          onSave={handleEditClassroom}
        />
      )}

      {/* Day Breakdown Modal */}
      {selectedDay && (
        <DayBreakdownModal
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

function EditClassroomModal({ classroom, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState(classroom.name);
  const [description, setDescription] = useState(classroom.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('classrooms.nameRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(classroom.id, name, description);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('classrooms.failedToUpdate'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('classrooms.editClassroom')}</h3>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('classrooms.nameStar')}
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('classrooms.optionalDescription')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateClassroomModal({ onClose, onCreate }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('classrooms.nameRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreate(name, description);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('classrooms.failedToCreate'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('classrooms.createNewClassroom')}</h3>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('classrooms.nameStar')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Biology 101"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('classrooms.optionalDescription')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? t('common.creating') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
