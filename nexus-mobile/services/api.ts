import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android Emulator uses 10.0.2.2 to access host localhost
// For physical device, you need your machine's LAN IP
const DEV_API_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:3005'
    : 'http://localhost:3005';

const api = axios.create({
    baseURL: DEV_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Token
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('nexus_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.access_token) {
            await AsyncStorage.setItem('nexus_token', res.data.access_token);
        }
        return res.data;
    },
    getProfile: async () => {
        const res = await api.get('/auth/profile');
        return res.data;
    }
};

export const chatApi = {
    getChannels: async () => {
        const res = await api.get('/channels');
        return res.data;
    },
    getMessages: async (channelId: number) => {
        const res = await api.get(`/channels/${channelId}/messages`);
        return res.data;
    },
    sendMessage: async (channelId: number, content: string) => {
        const res = await api.post(`/channels/${channelId}/messages`, { content });
        return res.data;
    }
};

export default api;
