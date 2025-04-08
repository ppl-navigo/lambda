import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.module?.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
};

export default nextConfig;