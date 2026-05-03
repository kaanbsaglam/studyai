import axios from 'axios';
import { getItem } from './storage';

// Update this to your backend URL (use LAN IP for physical device testing)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/api/v1';

export const TOKEN_KEY = 'studyai_access_token';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Surface error messages from the backend
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message ?? error.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  },
);

export default api;
