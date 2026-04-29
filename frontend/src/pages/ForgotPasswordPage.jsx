import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setError(t('forgotPassword.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        email: trimmed,
        locale: i18n.language,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || t('forgotPassword.failed'));
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
              {t('forgotPassword.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          <div style={{ padding: '8px 32px 32px 32px' }}>
            {submitted ? (
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
                }}
              >
                {t('forgotPassword.success')}
              </div>
            ) : (
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
                  {loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
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
