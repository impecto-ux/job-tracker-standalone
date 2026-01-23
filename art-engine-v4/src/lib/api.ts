import axios from 'axios';
import { useStore } from './store';

import { getApiUrl } from './config';

const api = axios.create({
    baseURL: getApiUrl(),
});

api.interceptors.request.use((config) => {
    const token = useStore.getState().auth.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useStore.getState().auth.logout();
        }
        return Promise.reject(error);
    }
);

export default api;
