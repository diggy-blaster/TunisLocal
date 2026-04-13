import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', 'expo-server-sdk'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
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
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.tile.openstreetmap.org' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
};

export default withNextIntl(nextConfig);