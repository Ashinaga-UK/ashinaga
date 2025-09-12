/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@workspace/ui'],

  // Strict mode for better development experience
  reactStrictMode: true,

  // Disable static optimization to avoid build issues
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
