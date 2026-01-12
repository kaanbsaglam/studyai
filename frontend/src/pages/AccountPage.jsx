import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import TimerPill from '../components/timer/TimerPill';

export default function AccountPage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/account/usage');
      setUsage(response.data.data);
    } catch (err) {
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!confirm('Upgrade to Premium? (This is a mock payment - no actual charge)')) {
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
      setError(err.response?.data?.error?.message || 'Failed to upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!confirm('Downgrade to Free plan? You will lose Premium benefits.')) {
      return;
    }

    try {
      await api.post('/account/downgrade');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to downgrade');
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
                to="/settings"
                className="text-gray-500 hover:text-gray-700"
                title="Settings"
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
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Account & Usage</h2>

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
                  <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        usage.tier === 'PREMIUM'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {usage.tier}
                    </span>
                  </div>
                </div>
                {usage.tier === 'FREE' ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50"
                  >
                    {upgrading ? 'Upgrading...' : 'Upgrade to Premium'}
                  </button>
                ) : (
                  <button
                    onClick={handleDowngrade}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Downgrade to Free
                  </button>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage</h3>

              <div className="space-y-6">
                {/* Classrooms */}
                <UsageBar
                  label="Classrooms"
                  used={usage.usage.classrooms}
                  max={usage.usage.maxClassrooms}
                  format={(v) => v}
                />

                {/* Storage */}
                <UsageBar
                  label="Storage"
                  used={usage.usage.storageBytes}
                  max={usage.usage.maxStorageBytes}
                  format={(v, isMax) =>
                    isMax ? usage.usage.maxStorageFormatted : usage.usage.storageFormatted
                  }
                />

                {/* Tokens Today */}
                <UsageBar
                  label="Tokens Today"
                  used={usage.usage.tokensToday}
                  max={usage.usage.maxTokensPerDay}
                  format={(v) => v.toLocaleString()}
                />
              </div>
            </div>

            {/* Plan Comparison */}
            {usage.tier === 'FREE' && (
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upgrade to Premium
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Free Plan</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>5 classrooms</li>
                      <li>100 MB storage</li>
                      <li>50,000 tokens/day</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-700 mb-2">Premium Plan</h4>
                    <ul className="space-y-1 text-purple-600">
                      <li>50 classrooms</li>
                      <li>2 GB storage</li>
                      <li>1,000,000 tokens/day</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50"
                >
                  {upgrading ? 'Upgrading...' : 'Upgrade Now'}
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
