import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://13.201.193.204/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error — server unreachable
      return Promise.reject(new Error('Network error: unable to reach the server.'));
    }
    return Promise.reject(error);
  },
);

export default api;
