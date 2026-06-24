'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** @deprecated Use /onboarding wizard */
export default function AutobiographyDeclarationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);
  return null;
}
