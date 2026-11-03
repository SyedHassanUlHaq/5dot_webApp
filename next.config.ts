import type { NextConfig } from 'next';
import { BASE_SECURITY_HEADERS, HSTS } from './src/lib/csp';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // Docker image: `BUILD_STANDALONE=1 next build` emits a minimal self-contained server in .next/standalone.
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  async headers() {
    // The Content-Security-Policy (with a per-request nonce) is set in src/middleware.ts.
    const headers = [
      ...BASE_SECURITY_HEADERS,
      ...(process.env.NODE_ENV === 'production' ? [HSTS] : []),
    ];
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
