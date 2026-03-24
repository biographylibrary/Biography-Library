import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ConditionalHeader } from '@/components/conditional-header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Biography Library - Preserving Stories in Switzerland',
  description: 'Write and preserve life stories with Biography Library',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        </Providers>
      </body>
    </html>
  );
}
