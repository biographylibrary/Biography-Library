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
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // sharp (elaborazione delle foto) non si impacchetta con webpack: si carica da node_modules.
    // ATTENZIONE: in Next 13.5 il pacchetto `standalone` contiene il codice JavaScript di sharp ma non
    // il suo binario nativo (libvips), che sharp carica con un require dinamico che il tracciamento dei
    // file non vede, e `outputFileTracingIncludes` qui vale solo per le pagine del Pages Router, non
    // per le rotte dell'App Router (verificato nel codice di Next 13.5.1). Senza rimedio, fuori dalla
    // cartella del progetto la rotta delle foto risponde 500 «Could not load the "sharp" module».
    // Il rimedio è nel Dockerfile: si copia node_modules/@img (i binari della piattaforma) nell'immagine.
    // La prova è la verifica automatica .github/workflows/docker-image.yml.
    serverComponentsExternalPackages: ['docx', '@supabase/supabase-js', 'sharp'],
  },
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
