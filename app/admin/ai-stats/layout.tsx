'use client';

import { AdminOnlyLayout } from '@/components/admin/AdminOnlyLayout';

export default function AdminAiStatsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnlyLayout>{children}</AdminOnlyLayout>;
}
