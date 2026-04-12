/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ React 18 Strict Mode (optional, can disable for dev)
  reactStrictMode: true,

  // ✅ Allow CommonJS modules (for your geo.js, notifications.js, etc.)
  serverComponentsExternalPackages: ['pg', 'crypto', 'expo-server-sdk'],

  // ✅ i18n configuration for next-intl (optional if using middleware-only routing)
  i18n: {
    locales: ['en', 'fr', 'ar'],
    defaultLocale: 'en',
    localeDetection: true,
  },

  // ✅ Webpack tweaks for native modules & Leaflet
  webpack: (config, { isServer }) => {
    // Fix Leaflet default icon import in SSR
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Handle pg-native optional dependency (not needed for node-postgres)
    config.externals = [...(config.externals || []), 'pg-native'];

    return config;
  },

  // ✅ Output: standalone for Vercel serverless optimization
  output: 'standalone',

  // ✅ Compress static assets
  compress: true,

  // ✅ Powered-by header removal (minor security)
  poweredByHeader: false,

  // ✅ Image domains (if you use next/image with external URLs)
  images: {
    domains: ['unpkg.com', 'tile.openstreetmap.org'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },

  // ✅ Experimental: optimize server components
  experimental: {
    serverComponentsExternalPackages: ['pg', 'crypto', 'expo-server-sdk'],
  },
};

export default nextConfig;
