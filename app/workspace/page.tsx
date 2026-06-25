'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Loader } from 'lucide-react';

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function redirect() {
      const { data } = await supabase
        .from('biographies')
        .select('id')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        router.replace(`/biography/${data.id}/edit`);
      } else {
        router.replace('/dashboard');
      }
    }

    redirect();
  }, [user, authLoading, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
