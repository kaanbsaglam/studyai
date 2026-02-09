import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, filterTier, filterRole]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (filterTier) params.append('tier', filterTier);
      if (filterRole) params.append('role', filterRole);

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.data.users);
      setPagination((prev) => ({
        ...prev,
        ...response.data.data.pagination,
      }));
    } catch (err) {
      setError(t('adminPage.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async (userId, newTier) => {
    try {
      await api.patch(`/admin/users/${userId}/tier`, { tier: newTier });
      setUsers(users.map((u) => (u.id === userId ? { ...u, tier: newTier } : u)));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error?.message || t('adminPage.failedToUpdateTier'));
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error?.message || t('adminPage.failedToUpdateRole'));
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(t('adminPage.deleteConfirm', { email: userEmail }))) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error?.message || t('adminPage.failedToDeleteUser'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">{t('common.studyai')}</h1>
              <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">{t('common.admin')}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/classrooms" className="text-gray-600 hover:text-gray-900">
                {t('adminPage.myClassrooms')}
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
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('adminPage.title')}</h2>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title={t('adminPage.totalUsers')} value={stats.users.total} />
            <StatCard
              title={t('adminPage.freePremium')}
              value={`${stats.users.free} / ${stats.users.premium}`}
            />
            <StatCard title={t('adminPage.classrooms')} value={stats.content.classrooms} />
            <StatCard
              title={t('adminPage.storageUsed')}
              value={stats.content.storageFormatted}
            />
          </div>
        )}

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('adminPage.users')}</h3>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder={t('adminPage.searchPlaceholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('adminPage.allTiers')}</option>
                <option value="FREE">{t('adminPage.free')}</option>
                <option value="PREMIUM">{t('adminPage.premium')}</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('adminPage.allRoles')}</option>
                <option value="USER">{t('adminPage.user')}</option>
                <option value="ADMIN">{t('common.admin')}</option>
              </select>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="m-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Users Table */}
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.userColumn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.tier')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.content')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.joined')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPage.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === user.id ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.name || '-'}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={u.tier}
                          onChange={(e) => handleUpdateTier(u.id, e.target.value)}
                          disabled={u.id === user.id}
                          className={`text-sm rounded px-2 py-1 ${
                            u.tier === 'PREMIUM'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          } ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="FREE">{t('adminPage.free')}</option>
                          <option value="PREMIUM">{t('adminPage.premium')}</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          disabled={u.id === user.id}
                          className={`text-sm rounded px-2 py-1 ${
                            u.role === 'ADMIN'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          } ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="USER">{t('adminPage.user')}</option>
                          <option value="ADMIN">{t('common.admin')}</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {t('adminPage.classroomsDocs', { classrooms: u._count?.classrooms || 0, docs: u._count?.documents || 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {u.id !== user.id && u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {t('adminPage.pageOf', { current: pagination.page, total: pagination.totalPages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  {t('common.previous')}
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
