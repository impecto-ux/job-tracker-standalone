export const getBaseUrl = () => {
    // Force re-bundle: v4.2.1-connectivity-fix
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

    if (typeof window === 'undefined') return 'http://127.0.0.1:3001';

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Production Cloud
    if (hostname === '37.148.214.203') {
        return 'http://37.148.214.203';
    }

    // Localhost / LAN
    // Force 127.0.0.1 for reliability against IPv6/localhost stalls
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//127.0.0.1:3001`;
    }
    return `${protocol}//${hostname}:3001`;
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
