/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@workspace/ui'],

  // Strict mode for better development experience
  reactStrictMode: true,

  // Webpack configuration to address build issues
  webpack: (config, { isServer }) => {
    // Disable certain optimizations that might cause issues
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },
};

export default nextConfig;
