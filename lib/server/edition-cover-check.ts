import { resolveMediaOwnerId, type MediaOwnerClient } from '@/lib/edition-media-owner';

type CoverMediaClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        in: (column: string, values: readonly string[]) => {
          limit: (n: number) => {
            maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
          };
        };
      };
    };
  };
};

/** True se il proprietario dei media della scheda ha una copertina (cover o cover_a5). */
export async function biographyHasCoverPhoto(
  client: unknown,
  biographyId: string
): Promise<boolean> {
  const mediaOwnerId = await resolveMediaOwnerId(client as MediaOwnerClient, biographyId);
  const media = client as CoverMediaClient;
  const { data } = await media
    .from('biography_media')
    .select('id')
    .eq('biography_id', mediaOwnerId)
    .in('layout', ['cover', 'cover_a5'])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
