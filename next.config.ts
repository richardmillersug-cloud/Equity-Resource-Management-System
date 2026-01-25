import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Disable TypeScript errors during builds
    ignoreBuildErrors: true,
  },
  // Empty turbopack config to acknowledge Turbopack is the default in Next.js 16
  turbopack: {},
  // Fix for ChunkLoadError - disable chunk optimization during development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable chunk splitting in development to prevent chunk loading issues
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    return config;
  },
  // Experimental features to help with chunk loading
  experimental: {
    // Removed optimizePackageImports to prevent configuration errors
  },
};

export default nextConfig;
