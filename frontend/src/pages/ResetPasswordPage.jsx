import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user is currently logged in, log them out — they should sign in fresh
  // with their new password.
  useEffect(() => {
    if (token) {
      localStorage.removeItem('token');
    }
  }, [token]);

  const isValidPassword = (value) => value.length >= 8 && value.length <= 64;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('resetPassword.invalidLink'));
      return;
    }

    if (!isValidPassword(password)) {
      setError(t('resetPassword.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('resetPassword.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-6 w-full min-h-screen flex flex-col relative overflow-hidden font-display"
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <ThemeToggle />
      </div>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full blur-3xl opacity-50"
        style={{
          width: '800px',
          height: '800px',
          background: 'var(--hero-glow)',
        }}
      ></div>

      <div
        className="flex flex-1 flex-col relative z-10 justify-center items-center"
        style={{ padding: '24px' }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: '480px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ padding: '32px 32px 16px 32px', textAlign: 'center' }}>
            <h2
              style={{
                color: 'var(--text-primary)',
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '-0.015em',
                marginBottom: '24px',
              }}
            >
              {t('common.studyai')}
            </h2>
            <h1
              style={{
                color: 'var(--text-secondary)',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              {t('resetPassword.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {t('resetPassword.subtitle')}
            </p>
          </div>

          <div style={{ padding: '8px 32px 32px 32px' }}>
            {success ? (
              <div
                className="w-full"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.10)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                {t('resetPassword.success')}
              </div>
            ) : !token ? (
              <div
                className="w-full"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {t('resetPassword.invalidLink')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
                {error && (
                  <div
                    className="w-full"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '13px',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="flex flex-col" style={{ gap: '6px' }}>
                  <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                    {t('resetPassword.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: '44px',
                        padding: '0 44px 0 12px',
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--input-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      minLength={8}
                      maxLength={64}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-transparent p-0"
                      style={{ color: 'var(--text-secondary)', border: 'none', outline: 'none' }}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {t('register.passwordHint')}
                  </p>
                </div>

                <div className="flex flex-col" style={{ gap: '6px' }}>
                  <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                    {t('register.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: '44px',
                        padding: '0 44px 0 12px',
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--input-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                      placeholder="••••••••"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      minLength={8}
                      maxLength={64}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-transparent p-0"
                      style={{ color: 'var(--text-secondary)', border: 'none', outline: 'none' }}
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  style={{
                    height: '48px',
                    backgroundColor: 'var(--accent)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                  }}
                >
                  {loading ? t('resetPassword.resetting') : t('resetPassword.resetPassword')}
                </button>
              </form>
            )}

            <p
              style={{
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                marginTop: '24px',
              }}
            >
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                {t('forgotPassword.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
