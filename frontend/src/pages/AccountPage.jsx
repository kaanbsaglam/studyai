import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TimerPill from '../components/timer/TimerPill';
import HeaderMenu from '../components/HeaderMenu';

export default function AccountPage() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/account/usage');
      setUsage(response.data.data);
    } catch (err) {
      setError(t('account.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!confirm(t('account.upgradeConfirm'))) {
      return;
    }

    setUpgrading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/account/upgrade');
      setSuccess(response.data.message);
      // Refresh usage data
      fetchUsage();
      // Reload page to update user context
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error?.message || t('account.failedToUpgrade'));
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!confirm(t('account.downgradeConfirm'))) {
      return;
    }

    try {
      await api.post('/account/downgrade');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error?.message || t('account.failedToDowngrade'));
    }
  };

  const getUsagePercent = (used, max) => {
    return Math.min(100, Math.round((used / max) * 100));
  };

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
                  className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                >
                  {t('common.admin')}
                </Link>
              )}
              <TimerPill />
              <HeaderMenu />
              <span className="text-gray-600">{user?.name || user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('account.title')}</h2>

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

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : usage && (
          <>
            {/* Current Plan */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('account.currentPlan')}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        usage.tier === 'PREMIUM'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      style={usage.tier === 'PREMIUM' ? { backgroundColor: 'var(--accent)', color: '#fff' } : {}}
                    >
                      {usage.tier}
                    </span>
                  </div>
                </div>
                {usage.tier === 'FREE' ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="px-4 py-2 text-white rounded-md font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {upgrading ? t('account.upgrading') : t('account.upgradeToPremium')}
                  </button>
                ) : (
                  <button
                    onClick={handleDowngrade}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    {t('account.downgradeToFree')}
                  </button>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('account.usage')}</h3>

              <div className="space-y-6">
                {/* Classrooms */}
                <UsageBar
                  label={t('account.classrooms')}
                  used={usage.usage.classrooms}
                  max={usage.usage.maxClassrooms}
                  format={(v) => v}
                />

                {/* Storage */}
                <UsageBar
                  label={t('account.storage')}
                  used={usage.usage.storageBytes}
                  max={usage.usage.maxStorageBytes}
                  format={(v, isMax) =>
                    isMax ? usage.usage.maxStorageFormatted : usage.usage.storageFormatted
                  }
                />

                {/* Tokens Today */}
                <UsageBar
                  label={t('account.tokensToday')}
                  used={usage.usage.tokensToday}
                  max={usage.usage.maxTokensPerDay}
                  format={(v) => v.toLocaleString()}
                />
              </div>
            </div>

            {/* Plan Comparison */}
            {usage.tier === 'FREE' && (
              <div className="mt-6 rounded-lg shadow p-6" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('account.upgradeToPremium')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">{t('account.freePlan')}</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>{t('account.freeClassrooms')}</li>
                      <li>{t('account.freeStorage')}</li>
                      <li>{t('account.freeTokens')}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: 'var(--accent)' }}>{t('account.premiumPlan')}</h4>
                    <ul className="space-y-1" style={{ color: 'var(--accent)' }}>
                      <li>{t('account.premiumClassrooms')}</li>
                      <li>{t('account.premiumStorage')}</li>
                      <li>{t('account.premiumTokens')}</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-4 w-full px-4 py-2 text-white rounded-md font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {upgrading ? t('account.upgrading') : t('account.upgradeNow')}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function UsageBar({ label, used, max, format }) {
  const percent = Math.min(100, Math.round((used / max) * 100));
  const isHigh = percent >= 80;
  const isFull = percent >= 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={isFull ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {format(used, false)} / {format(max, true)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isFull ? 'bg-red-500' : isHigh ? 'bg-yellow-500' : 'bg-blue-600'
          }`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}
