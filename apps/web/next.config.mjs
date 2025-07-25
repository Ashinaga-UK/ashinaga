/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@workspace/ui'],

  // Strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
