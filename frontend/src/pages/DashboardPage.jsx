import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import HeaderMenu from '../components/HeaderMenu';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{t('common.studyai')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {user?.name || user?.email}
              </span>
              <HeaderMenu />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {t('dashboardPage.welcome', { name: user?.name || 'Student' })}
          </h2>
          <p className="text-gray-600">
            {t('dashboardPage.dashboardReady')}
          </p>
        </div>
      </main>
    </div>
  );
}
