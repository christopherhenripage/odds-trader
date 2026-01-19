/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@odds-trader/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
