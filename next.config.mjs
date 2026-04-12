/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow CommonJS modules in App Router
  serverComponentsExternalPackages: ['pg', 'crypto'],
};
export default nextConfig;
