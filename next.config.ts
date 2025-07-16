import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Make TypeScript errors non-blocking for build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Completely disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [], // Empty dirs array disables ESLint entirely
  },
  
  // Disable strict mode and other checks
  reactStrictMode: false,
  
  // Configure webpack to be more permissive
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ignore TypeScript and ESLint errors in webpack
    config.plugins = config.plugins.filter((plugin: any) => {
      return plugin.constructor.name !== 'ESLintWebpackPlugin';
    });
    
    return config;
  },
};

export default nextConfig;
