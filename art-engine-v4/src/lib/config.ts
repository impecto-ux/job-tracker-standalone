
export const getBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3001'; // Server side default

    const hostname = window.location.hostname;

    // Production Cloud
    if (hostname === '37.148.214.203') {
        return 'http://37.148.214.203';
    }

    // Localhost
    return 'http://localhost:3001';
};

// Socket URL stays at root (Nginx handles /socket.io)
export const getSocketUrl = () => {
    return getBaseUrl();
};

// API URL needs /api prefix for Nginx to proxy correctly
export const getApiUrl = () => {
    const base = getBaseUrl();
    if (base.includes('37.148.214.203')) {
        return `${base}/api`;
    }
    return base;
};
