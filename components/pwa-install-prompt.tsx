'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Download, Share } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_until';
const IOS_DISMISS_KEY = 'pwa_ios_dismissed_until';
const DISMISS_DAYS = 7;
/** Shorter delay so users see the prompt before navigating away (was 30s). */
const SHOW_DELAY_MS = 8000;

/** iPadOS 13+ often reports as desktop Safari; detect touch Macs. */
function isAppleMobileOrTablet() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const nav = navigator as Navigator & { maxTouchPoints?: number; userAgentData?: { platform?: string } };
  if (nav.userAgentData?.platform === 'iOS') return true;
  if (navigator.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1) return true;
  return false;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isDismissed(key: string) {
  try {
    const until = localStorage.getItem(key);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch {
    return false;
  }
}

function setDismissed(key: string) {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, String(until));
  } catch {
    /* ignore */
  }
}

/**
 * Offer install on marketing/auth flows. Hide on app shell (editor, admin, etc.)
 * so Chromium can still fire beforeinstallprompt on "/" while users browse elsewhere.
 */
function shouldOfferPwaInstall(pathname: string | null): boolean {
  if (!pathname) return false;
  const excluded =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/biography/') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings');
  return !excluded;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  const allowInstallUi = shouldOfferPwaInstall(pathname);
  const isApple = isAppleMobileOrTablet();

  useEffect(() => {
    if (!allowInstallUi || isApple || isDismissed(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [allowInstallUi, isApple]);

  useEffect(() => {
    if (!deferredPrompt || !allowInstallUi) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [deferredPrompt, allowInstallUi]);

  useEffect(() => {
    if (!allowInstallUi || !isApple || isStandalone() || isDismissed(IOS_DISMISS_KEY)) return;
    const timer = setTimeout(() => setIosVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allowInstallUi, isApple, pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(DISMISS_KEY);
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(DISMISS_KEY);
    setVisible(false);
  };

  const handleIosDismiss = () => {
    setDismissed(IOS_DISMISS_KEY);
    setIosVisible(false);
  };

  return (
    <>
      {visible && (
        <div
          role="banner"
          className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg px-4 py-3 max-w-sm w-full">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Download className="h-4 w-4" />
            </div>
            <p className="flex-1 text-sm text-foreground leading-snug">
              {t.pwa.installBannerText}
            </p>
            <button
              onClick={handleInstall}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t.pwa.installButton}
            </button>
            <button
              onClick={handleDismiss}
              aria-label={t.pwa.dismissButton}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {iosVisible && (
        <div
          role="banner"
          className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg px-4 py-3 max-w-sm w-full">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Share className="h-4 w-4" />
            </div>
            <p className="flex-1 text-sm text-foreground leading-snug">
              {t.pwa.iosInstallText}
            </p>
            <button
              onClick={handleIosDismiss}
              aria-label={t.pwa.dismissButton}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
