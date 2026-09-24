'use client';

import { SiteLegalDocument } from '@/components/legal/SiteLegalDocument';

export function TermsOfServiceContent({ hideTitle = false }: { hideTitle?: boolean }) {
  return <SiteLegalDocument doc="terms" hideTitle={hideTitle} />;
}
