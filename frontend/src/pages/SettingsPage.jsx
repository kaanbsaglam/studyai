import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../hooks/useTimer';
import TimerPill from '../components/timer/TimerPill';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, settingsLoading, updateSettings } = useTimer();

  const [localSettings, setLocalSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize local settings from context when loaded
  if (!localSettings && !settingsLoading) {
    setLocalSettings({ ...settings });
  }

  const handleChange = (field, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear messages on change
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateSettings(localSettings);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings({ ...settings });
    setError('');
    setSuccess('');
  };

  const hasChanges = localSettings && JSON.stringify(localSettings) !== JSON.stringify(settings);

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
              <TimerPill />
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
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {settingsLoading || !localSettings ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Timer Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🍅</span>
                <h3 className="text-lg font-semibold text-gray-900">Pomodoro Timer</h3>
              </div>

              <div className="space-y-6">
                {/* Focus Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Focus Duration
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="120"
                      value={localSettings.focusDuration}
                      onChange={(e) => handleChange('focusDuration', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <span className="w-20 text-sm text-gray-600 text-right">
                      {localSettings.focusDuration} min
                    </span>
                  </div>
                </div>

                {/* Short Break Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Break
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={localSettings.shortBreakDuration}
                      onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <span className="w-20 text-sm text-gray-600 text-right">
                      {localSettings.shortBreakDuration} min
                    </span>
                  </div>
                </div>

                {/* Long Break Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Long Break
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={localSettings.longBreakDuration}
                      onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <span className="w-20 text-sm text-gray-600 text-right">
                      {localSettings.longBreakDuration} min
                    </span>
                  </div>
                </div>

                {/* Sessions Before Long Break */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions before long break
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={localSettings.sessionsBeforeLong}
                      onChange={(e) => handleChange('sessionsBeforeLong', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="w-20 text-sm text-gray-600 text-right">
                      {localSettings.sessionsBeforeLong} sessions
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200" />

                {/* Sound Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Sound Notifications
                    </label>
                    <p className="text-sm text-gray-500">
                      Play a sound when a session ends
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('soundEnabled', !localSettings.soundEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto-start Breaks */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Auto-start Breaks
                    </label>
                    <p className="text-sm text-gray-500">
                      Automatically start break timer after focus session
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('autoStartBreaks', !localSettings.autoStartBreaks)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.autoStartBreaks ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.autoStartBreaks ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Save/Reset Buttons */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Future settings placeholder */}
            <div className="mt-6 bg-gray-100 rounded-lg p-6 text-center text-gray-500">
              <p className="text-sm">More settings coming soon...</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
