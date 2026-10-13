import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { siteOrigin } from '@/lib/edition-alternates';
import { resolveEditionViewAlternates } from '@/lib/edition-view-metadata';

export const dynamic = 'force-dynamic';

function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: 'no-store',
        }),
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const client = createAnonServerClient();
    const result = await resolveEditionViewAlternates(
      client,
      params.id,
      siteOrigin()
    );
    if (!result) return {};
    return {
      alternates: {
        canonical: result.canonical,
        ...(result.languages ? { languages: result.languages } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function BiographyViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
