import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ConditionalHeader } from '@/components/conditional-header';
import { Footer } from '@/components/footer';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { DevUnregisterServiceWorker } from '@/components/dev-unregister-sw';
import { DEV_CLEAR_PWA_SCRIPT } from '@/lib/dev-clear-pwa';

const isDev = process.env.NODE_ENV === 'development';

const CURSOR_BROWSER_HINT_SCRIPT = `(function(){try{if(!/Cursor\\//.test(navigator.userAgent))return;var el=document.getElementById('bl-cursor-hint');if(!el)return;el.style.display='flex';var t=setInterval(function(){var m=document.querySelector('main');if(m&&m.textContent.trim().length>30){el.style.display='none';clearInterval(t)}},500);setTimeout(function(){clearInterval(t)},15000)}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'Biography Library — Because every life deserves to be remembered',
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
        {isDev ? (
          <script dangerouslySetInnerHTML={{ __html: DEV_CLEAR_PWA_SCRIPT }} />
        ) : (
          <link rel="manifest" href="/manifest.json" />
        )}
        {isDev && (
          <noscript>
            <style>{`body{font-family:system-ui;padding:2rem;background:#EDEBE7;color:#121212}`}</style>
            <p>Abilita JavaScript oppure apri questa app in Chrome/Safari.</p>
          </noscript>
        )}
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BioLib" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {isDev && (
          <>
            <div
              id="bl-cursor-hint"
              style={{
                display: 'none',
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                background: '#EDEBE7',
                color: '#121212',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              <div
                style={{
                  maxWidth: '28rem',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #616161',
                  background: '#FDFBF7',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Browser integrato Cursor
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem', color: '#616161' }}>
                  In sviluppo, Next.js spesso non si idrata nel browser interno di Cursor.
                  Usa Chrome o Safari per lavorare sull&apos;app.
                </p>
                <a
                  href="http://localhost:3000/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    background: '#121212',
                    color: '#FDFBF7',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  Apri in browser esterno
                </a>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{ __html: CURSOR_BROWSER_HINT_SCRIPT }} />
          </>
        )}
        <Providers>
          <div className="flex flex-col h-screen overflow-hidden">
            <ConditionalHeader />
            <main className="flex-1 overflow-auto min-h-0">
              {children}
            </main>
            <Footer />
          </div>
          <PwaInstallPrompt />
          <DevUnregisterServiceWorker />
        </Providers>
      </body>
    </html>
  );
}
