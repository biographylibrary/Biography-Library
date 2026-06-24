import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserBiographyCount, ONE_BIOGRAPHY_PER_USER_ERROR } from '@/lib/biography-limits';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn<(table: string) => { select: typeof mockSelect }>();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('biography-limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('exports a stable one-biography error code', () => {
    expect(ONE_BIOGRAPHY_PER_USER_ERROR).toBe('one_biography_per_user');
  });

  it('returns biography count for a user', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const count = await getUserBiographyCount('user-1');
    expect(count).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith('biographies');
  });

  it('returns 0 when the count query fails', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'db error' } }),
    });

    expect(await getUserBiographyCount('user-1')).toBe(0);
  });

  it('treats null count as zero biographies', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ count: null, error: null }),
    });

    expect(await getUserBiographyCount('user-1')).toBe(0);
  });
});
