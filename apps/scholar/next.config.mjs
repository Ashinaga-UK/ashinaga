/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@workspace/ui'],

  // Strict mode for better development experience
  reactStrictMode: true,

  // Webpack configuration to address build issues
  webpack: (config, { isServer }) => {
    // Handle potential undefined issues
    config.module.rules = config.module.rules || [];

    return config;
  },
};

export default nextConfig;
