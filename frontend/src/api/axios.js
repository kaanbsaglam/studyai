import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, clear the token and redirect to login.
    // Skip the redirect on auth pages so we don't bounce users mid-flow.
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      const path = window.location.pathname;
      const onAuthPage =
        path.includes('/login') ||
        path.includes('/register') ||
        path.includes('/forgot-password') ||
        path.includes('/reset-password');
      if (!onAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
