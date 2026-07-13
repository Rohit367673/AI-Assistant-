import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If running local Vite dev server on port 5173, point to backend dev server on port 5001
  if (window.location.port === '5173') {
    return 'http://localhost:5001/api';
  }
  // Standard production fallback
  return `${window.location.origin}/api`;
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add Auth Token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinicToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
