import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ModerationReport, ModerationFilters } from './types';

interface UseModerationReportsResult {
  reports: ModerationReport[];
  unassignedCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModerationReports(filters: ModerationFilters): UseModerationReportsResult {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('moderation_reports')
          .select(`
            id,
            biography_id,
            reporter_id,
            report_type,
            description,
            status,
            ai_analysis,
            ai_violation_level,
            decision,
            decision_reason,
            created_at,
            updated_at,
            biographies (
              title,
              profiles ( name )
            )
          `);

        if (filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters.type !== 'all') {
          query = query.eq('report_type', filters.type);
        }

        query = query.order('created_at', { ascending: filters.sort === 'oldest' });

        const { data, error: fetchError } = await query;

        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        const mapped: ModerationReport[] = (data ?? []).map((row: any) => ({
          id: row.id,
          biography_id: row.biography_id,
          reporter_id: row.reporter_id,
          report_type: row.report_type,
          description: row.description,
          status: row.status,
          ai_analysis: row.ai_analysis ?? {},
          ai_violation_level: row.ai_violation_level,
          decision: row.decision,
          decision_reason: row.decision_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          biography_title: row.biographies?.title ?? null,
          biography_author: row.biographies?.profiles?.name ?? null,
        }));

        setReports(mapped);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadUnassignedCount() {
      const { count } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'unassigned');
      if (!cancelled) setUnassignedCount(count ?? 0);
    }

    load();
    loadUnassignedCount();

    return () => { cancelled = true; };
  }, [filters.status, filters.type, filters.sort, tick]);

  return { reports, unassignedCount, loading, error, refresh };
}
