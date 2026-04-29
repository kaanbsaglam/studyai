import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useChatMode } from '../context/ChatModeContext';
import { CHAT_MODES } from '../context/chatModeConstants';
import { useTimer } from '../hooks/useTimer';
import TimerPill from '../components/timer/TimerPill';
import HeaderMenu from '../components/HeaderMenu';
import LanguageToggle from '../components/LanguageToggle';
import api from '../api/axios';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { mode: chatMode, setMode: setChatMode, canUseOrchestrator } = useChatMode();
  const { settings, settingsLoading, updateSettings } = useTimer();

  const [localSettings, setLocalSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Account / password section state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [setPwSending, setSetPwSending] = useState(false);
  const [setPwMessage, setSetPwMessage] = useState('');

  const hasPassword = user?.hasPassword !== false; // treat undefined as true for old tokens

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 8 || newPassword.length > 64) {
      setPwError(t('account.passwordLength'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError(t('account.passwordsNoMatch'));
      return;
    }

    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess(t('account.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPwError(err.response?.data?.error?.message || t('account.changeFailed'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleSendSetPasswordEmail = async () => {
    if (!user?.email) return;
    setSetPwMessage('');
    setSetPwSending(true);
    try {
      await api.post('/auth/forgot-password', {
        email: user.email,
        locale: i18n.language,
      });
      setSetPwMessage(t('account.setPasswordEmailSent'));
      // After they reset, /me will reflect hasPassword: true
      refreshUser?.().catch(() => {});
    } catch (err) {
      setSetPwMessage(err.response?.data?.error?.message || t('account.setPasswordFailed'));
    } finally {
      setSetPwSending(false);
    }
  };

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
      setSuccess(t('settings.settingsSaved'));
    } catch (err) {
      setError(err.response?.data?.error?.message || t('settings.failedToSave'));
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
              <HeaderMenu />
              <Link
                to="/account"
                className={`link-btn ${
                  user?.tier === 'PREMIUM' ? 'link-btn-premium' : ''
                }`}
              >
                {user?.tier || 'FREE'}
              </Link>
              <span className="text-gray-600">{user?.name || user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('settings.title')}</h2>

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
                <h3 className="text-lg font-semibold text-gray-900">{t('settings.pomodoroTimer')}</h3>
              </div>

              <div className="space-y-6">
                {/* Focus Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.focusDuration')}
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
                      {localSettings.focusDuration} {t('common.min')}
                    </span>
                  </div>
                </div>

                {/* Short Break Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.shortBreak')}
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
                      {localSettings.shortBreakDuration} {t('common.min')}
                    </span>
                  </div>
                </div>

                {/* Long Break Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.longBreak')}
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
                      {localSettings.longBreakDuration} {t('common.min')}
                    </span>
                  </div>
                </div>

                {/* Sessions Before Long Break */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.sessionsBeforeLong')}
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
                      {localSettings.sessionsBeforeLong} {t('common.sessions')}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200" />

                {/* Sound Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('settings.soundNotifications')}
                    </label>
                    <p className="text-sm text-gray-500">
                      {t('settings.soundDescription')}
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
                      {t('settings.autoStartBreaks')}
                    </label>
                    <p className="text-sm text-gray-500">
                      {t('settings.autoStartDescription')}
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
                  {t('common.reset')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('common.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>

            {/* Chat Mode */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💬</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings.chatMode')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {t('settings.chatModeDescription')}
              </p>

              {!canUseOrchestrator && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-xs">
                  {t('settings.chatModePremiumOnly')}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChatMode(CHAT_MODES.STANDARD)}
                  className={`text-left p-4 rounded-lg border-2 transition ${
                    chatMode === CHAT_MODES.STANDARD
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {t('settings.chatModeStandard')}
                    </span>
                    {chatMode === CHAT_MODES.STANDARD && (
                      <span className="text-xs text-blue-600 font-medium">●</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('settings.chatModeStandardDesc')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => canUseOrchestrator && setChatMode(CHAT_MODES.ORCHESTRATOR)}
                  disabled={!canUseOrchestrator}
                  className={`text-left p-4 rounded-lg border-2 transition ${
                    chatMode === CHAT_MODES.ORCHESTRATOR
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!canUseOrchestrator ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {t('settings.chatModeOrchestrator')}
                    </span>
                    {canUseOrchestrator ? (
                      chatMode === CHAT_MODES.ORCHESTRATOR && (
                        <span className="text-xs text-blue-600 font-medium">●</span>
                      )
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('settings.chatModeOrchestratorDesc')}
                  </p>
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-400 italic">
                {t('settings.chatModeSeparateHistory')}
              </p>
            </div>

            {/* Account / Security */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="text-lg font-semibold text-gray-900">{t('account.security')}</h3>
              </div>

              {hasPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {pwError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                      {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded text-sm">
                      {pwSuccess}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('account.currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('account.newPassword')}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={64}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('register.passwordHint')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('account.confirmNewPassword')}
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={64}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={pwSaving || !currentPassword || !newPassword || !confirmNewPassword}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pwSaving ? t('common.saving') : t('account.changePassword')}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('account.noPasswordExplanation')}
                  </p>
                  {setPwMessage && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm mb-3">
                      {setPwMessage}
                    </div>
                  )}
                  <button
                    onClick={handleSendSetPasswordEmail}
                    disabled={setPwSending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {setPwSending ? t('account.sending') : t('account.sendSetPasswordEmail')}
                  </button>
                </div>
              )}
            </div>

            {/* Future settings placeholder */}
            <div className="mt-6 bg-gray-100 rounded-lg p-6 text-center text-gray-500">
              <p className="text-sm">{t('settings.moreSettingsSoon')}</p>
            </div>

            {/* Language Settings */}
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('language.title')}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('language.selectLanguage')}</p>
                  <p className="text-sm text-gray-500">{t('language.description')}</p>
                </div>
                <LanguageToggle />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
