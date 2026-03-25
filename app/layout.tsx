import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ConditionalHeader } from '@/components/conditional-header';
import { Footer } from '@/components/footer';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'Biography Library - Preserving Stories in Switzerland',
  description: 'Because every life deserves to be remembered',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BioLib" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <Providers>
          <div className="flex flex-col h-screen overflow-hidden">
            <ConditionalHeader />
            <main className="flex-1 overflow-auto min-h-0">
              {children}
            </main>
            <Footer />
          </div>
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
