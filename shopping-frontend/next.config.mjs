/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:5000';

const nextConfig = {
  reactStrictMode: true,
  // The browser only ever talks to this Next.js origin — API calls are
  // proxied server-side to the Node/Express backend.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
