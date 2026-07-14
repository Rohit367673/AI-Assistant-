import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    // Ensure no trailing slash
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (window.location.port === '5173' || window.location.port === '3000') {
    return 'http://localhost:5001/api';
  }
  return `${window.location.origin}/api`;
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

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
