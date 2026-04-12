/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Next.js ≥ 14.1: top-level key (not in experimental), no built-ins like 'crypto'
  serverExternalPackages: ['pg', 'expo-server-sdk'],

  // ✅ No i18n block — use next-intl middleware instead for App Router

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // ✅ Safe pg-native exclusion regardless of externals shape
    if (Array.isArray(config.externals)) {
      config.externals.push('pg-native');
    } else {
      const original = config.externals;
      config.externals = async (ctx) => {
        const base = typeof original === 'function' ? await original(ctx) : original;
        return [...(Array.isArray(base) ? base : []), 'pg-native'];
      };
    }

    return config;
  },

  // ✅ Remove output: 'standalone' for Vercel — only use for Docker/self-hosted
  
  compress: true,
  poweredByHeader: false,

  // ✅ remotePatterns only, no deprecated domains[]
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.tile.openstreetmap.org',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },
};

export default nextConfig;
