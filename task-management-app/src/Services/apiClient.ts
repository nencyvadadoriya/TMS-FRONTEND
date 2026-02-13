// services/apiClient.ts
import axios from 'axios';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = Boolean(import.meta.env.DEV);
const resolvedBaseUrl =
    (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0)
        ? envBaseUrl
        : (isDev ? 'http://localhost:8100/api' : 'https://tms-backend-sand.vercel.app/api');

const apiClient = axios.create({
    baseURL: resolvedBaseUrl,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
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

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const msg = String(error?.message || '').trim();
        const code = String(error?.code || '').trim();
        const isTimeout = code === 'ECONNABORTED' || /timeout/i.test(msg);
        if (isTimeout) {
            error.message = 'Request timed out. Please try again.';
        }
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;