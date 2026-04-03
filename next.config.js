/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Service worker is required for Chromium's beforeinstallprompt; without it the install banner never appears.
  disable:
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== 'true',
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pdfjs-dist', '@napi-rs/canvas');
      }
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
