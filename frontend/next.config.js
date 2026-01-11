/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Use Railway backend in production, localhost in development
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'https://openterm-production.up.railway.app'
      : 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
