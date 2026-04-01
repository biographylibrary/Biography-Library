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
            assigned_to,
            assigned_moderator_id,
            assigned_at,
            ai_analysis,
            ai_violation_level,
            decision,
            decision_reason,
            moderator_notes,
            decided_by,
            decided_at,
            created_at,
            updated_at,
            biographies!biography_id (
              title,
              status,
              user_id
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

        const authorIds = Array.from(new Set((data ?? []).map((r: any) => r.biographies?.user_id).filter(Boolean)));
        let authorMap: Record<string, string> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', authorIds);
          for (const p of profiles ?? []) {
            authorMap[p.id] = p.name;
          }
        }

        const mapped: ModerationReport[] = (data ?? []).map((row: any) => ({
          id: row.id,
          biography_id: row.biography_id,
          reporter_id: row.reporter_id,
          reporter_email: null,
          report_type: row.report_type,
          description: row.description,
          status: row.status,
          assigned_to: row.assigned_to,
          assigned_moderator_id: row.assigned_moderator_id,
          assigned_at: row.assigned_at,
          ai_analysis: row.ai_analysis ?? {},
          ai_violation_level: row.ai_violation_level,
          decision: row.decision,
          decision_reason: row.decision_reason,
          moderator_notes: row.moderator_notes,
          decided_by: row.decided_by,
          decided_at: row.decided_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          biography_title: row.biographies?.title ?? null,
          biography_author: row.biographies?.user_id ? (authorMap[row.biographies.user_id] ?? null) : null,
          biography_author_id: row.biographies?.user_id ?? null,
          biography_status: row.biographies?.status ?? null,
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
