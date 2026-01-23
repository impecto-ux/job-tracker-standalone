import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const SOCKET_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:3005'
    : 'http://localhost:3005';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket'], // Force websocket
});
