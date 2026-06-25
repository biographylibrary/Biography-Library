'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-full bg-background">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>
      </div>
    </AdminGuard>
  );
}
