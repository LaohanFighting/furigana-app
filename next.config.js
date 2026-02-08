/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['kuroshiro', 'kuroshiro-analyzer-kuromoji'],
  },
};

module.exports = nextConfig;
