'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';

const PUBLIC_ROUTES_WITHOUT_HEADER = ['/'];

export function ConditionalHeader() {
  const pathname = usePathname();
  if (PUBLIC_ROUTES_WITHOUT_HEADER.includes(pathname ?? '')) return null;
  return <Header />;
}
