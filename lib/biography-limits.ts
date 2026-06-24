import { supabase } from './supabase';

export const ONE_BIOGRAPHY_PER_USER_ERROR = 'one_biography_per_user';

export async function getUserBiographyCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('biographies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}
