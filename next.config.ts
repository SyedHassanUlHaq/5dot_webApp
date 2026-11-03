import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Security headers + CSP are added in the hardening milestone.
};

export default nextConfig;
