/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // afterFiles rewrites are checked after pages/public files but before dynamic routes
      // fallback rewrites are checked after all routes
      fallback: [
        {
          source: '/api/:path*',
          destination: 'https://openterm-production.up.railway.app/api/:path*',
        },
        {
          source: '/ws/:path*',
          destination: 'https://openterm-production.up.railway.app/ws/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
