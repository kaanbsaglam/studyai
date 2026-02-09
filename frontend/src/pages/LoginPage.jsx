import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);
  const isValidPassword = (value) => value.length >= 8 && value.length <= 64;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('login.emailRequired'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError(t('login.invalidEmail'));
      return;
    }

    if (!isValidPassword(password)) {
      setError(t('login.passwordLength'));
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-6 w-full min-h-screen flex flex-col relative overflow-hidden font-display"
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
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
            <div
              className="flex items-center justify-center"
              style={{ gap: '12px', marginBottom: '24px' }}
            >
              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '36px',
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                }}
              >
                {t('common.studyai')}
              </h2>
            </div>
            <h1
              style={{
                color: 'var(--text-secondary)',
                fontSize: '28px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              {t('login.welcomeBack')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {t('login.enterDetails')}
            </p>
          </div>

          <div style={{ padding: '8px 32px 32px 32px' }}>
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '20px' }}>
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

              <div className="flex flex-col" style={{ gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                  {t('common.email')}
                </label>
                <input
                  className="w-full"
                  style={{
                    height: '48px',
                    padding: '0 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="student@mail.com"
                  type="email"
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col" style={{ gap: '8px' }}>
                <div className="flex justify-between items-center">
                  <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                    {t('common.password')}
                  </p>
                  <div className="text-sm cursor-pointer p-2" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    {t('login.forgotPassword')}
                  </div>
                </div>
                <div className="relative">
                  <input
                    className="w-full"
                    style={{
                      height: '48px',
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
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
                  }}
                >
                  {loading ? t('login.signingIn') : t('login.signIn')}
                </button>
              </div>
            </form>

            <p
              style={{
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                marginTop: '24px',
              }}
            >
              {t('login.noAccount')}{' '}
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                {t('login.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
