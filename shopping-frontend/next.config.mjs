/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:5000';

// GitHub Pages live demo — build a fully static export whose /api/* calls
// are answered by a service-worker mock (see public/sw.js). Set in CI:
//   NEXT_PUBLIC_STATIC_DEMO=true NEXT_PUBLIC_BASE_PATH=/shopeasy
const staticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  ...(staticDemo
    ? { output: 'export', basePath }
    : {
        // The browser only ever talks to this Next.js origin — API calls are
        // proxied server-side to the Node/Express backend.
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
        },
      }),
};

export default nextConfig;
