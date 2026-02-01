import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/uploads/:path*',
        destination: 'http://127.0.0.1:3001/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
