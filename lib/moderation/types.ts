export type ReportType =
  | 'level1_content'
  | 'level2_content'
  | 'level3_content'
  | 'user_report'
  | 'living_person'
  | 'right_to_oblivion'
  | 'impersonation'
  | 'copyright'
  | 'other';

export type ReportStatus = 'unassigned' | 'assigned' | 'in_review' | 'decided';

export type SortOrder = 'newest' | 'oldest';

export interface ModerationReport {
  id: string;
  biography_id: string;
  reporter_id: string | null;
  report_type: ReportType;
  description: string | null;
  status: ReportStatus;
  ai_analysis: { summary?: string } & Record<string, unknown>;
  ai_violation_level: number | null;
  decision: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  biography_title: string | null;
  biography_author: string | null;
}

export interface ModerationFilters {
  status: ReportStatus | 'all';
  type: ReportType | 'all';
  sort: SortOrder;
}
