import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/uploads/:path*',
        destination: 'http://127.0.0.1:3001/uploads/:path*',
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
