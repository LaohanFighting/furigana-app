/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['kuroshiro', 'kuroshiro-analyzer-kuromoji'],
    // 将 kuromoji 词典打入 serverless 包，否则 Vercel 上会 ENOENT base.dat.gz
    outputFileTracingIncludes: {
      '/api/furigana': ['./node_modules/kuromoji/dict/**'],
    },
  },
};

module.exports = nextConfig;
