/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'dist',
  basePath: '/syy-ai-wb',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
