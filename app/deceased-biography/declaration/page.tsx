'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** @deprecated Use /onboarding wizard */
export default function DeceasedDeclarationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);
  return null;
}
