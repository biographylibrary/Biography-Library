'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-[#ECE9E4] dark:bg-[#1F2121] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Biography Library | Hosted in Switzerland
            </p>
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <rect width="32" height="32" fill="#FF0000"/>
              <rect x="13" y="6" width="6" height="20" fill="white"/>
              <rect x="6" y="13" width="20" height="6" fill="white"/>
            </svg>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/terms-of-service"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              href="/privacy-policy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
