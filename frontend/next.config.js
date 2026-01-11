/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // beforeFiles rewrites are processed FIRST, before checking any files
    return [
      {
        source: '/api/:path*',
        destination: 'https://openterm-production.up.railway.app/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'https://openterm-production.up.railway.app/ws/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
