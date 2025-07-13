import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  i18n: {
    locales: ['en', 'lg'], // 'en' for English, 'lg' for Luganda
    defaultLocale: 'en',
    localeDetection: false, // We'll handle language switching manually
  },
};

export default nextConfig;
