/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Rewrites are handled by vercel.json in production
  // For local development, use NEXT_PUBLIC_BACKEND_URL env var
};

module.exports = nextConfig;
