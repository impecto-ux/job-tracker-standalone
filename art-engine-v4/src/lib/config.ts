
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

export const getSocketUrl = () => {
    return getBaseUrl();
};

export const getApiUrl = () => {
    // If backend logic changes (e.g. /api prefix), modify here
    return getBaseUrl();
};
