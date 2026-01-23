
export const getBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3001'; // Server side default

    const hostname = window.location.hostname;

    // Production Cloud
    if (hostname === '37.148.214.203') {
        return 'http://37.148.214.203:3001';
    }

    // Localhost
    return 'http://localhost:3001';
};

// Socket URL stays at root (Nginx handles /socket.io) -> Actually port 3001 for now
export const getSocketUrl = () => {
    return getBaseUrl();
};

// API URL matches Base URL (Backend routes are at root, not /api)
export const getApiUrl = () => {
    return getBaseUrl();
};
