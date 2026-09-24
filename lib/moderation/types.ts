export type ReportType =
  | 'level1_content'
  | 'level2_content'
  | 'level3_content'
  | 'user_report'
  | 'living_person'
  | 'right_to_oblivion'
  | 'impersonation'
  | 'copyright'
  | 'other'
  | 'illegal_content'
  | 'sensitive_personal_data'
  | 'defamation';

export type ReportOrigin = 'in_app' | 'email_channel' | 'screening';

export type AppealStatus = 'pending' | 'upheld' | 'rejected';

/** Lane is derived from report_type. Types not named here stay unclassified. */
export type ReportLane = 'immediate' | 'ordinary' | 'level1';

const REPORT_LANES: Partial<Record<ReportType, ReportLane>> = {
  living_person: 'immediate',
  illegal_content: 'immediate',
  right_to_oblivion: 'ordinary',
  sensitive_personal_data: 'ordinary',
  defamation: 'ordinary',
  copyright: 'ordinary',
  other: 'ordinary',
  level1_content: 'level1',
};

export function reportLane(type: ReportType): ReportLane | null {
  return REPORT_LANES[type] ?? null;
}

export type ReportStatus = 'unassigned' | 'assigned' | 'in_review' | 'decided';

export type SortOrder = 'newest' | 'oldest';

export type ModerationDecision =
  | 'publish'
  | 'publish_warning'
  | 'returned'
  | 'removed'
  | 'hide'
  | 'remove'
  | 'request_edit'
  | 'no_action';

export interface FlaggedPassage {
  text: string;
  reason: string;
  level: number | string;
}

export interface AiAnalysis {
  summary?: string;
  flagged_passages?: FlaggedPassage[];
  [key: string]: unknown;
}

export interface RejectedPassage {
  section_key: string;
  ai_reason: string;
}

export interface ModeratorNotes {
  text?: string;
  rejectedPassages?: RejectedPassage[];
  note?: string;
}

export interface ModerationReport {
  id: string;
  biography_id: string;
  reporter_id: string | null;
  reporter_email: string | null;
  reporter_name: string | null;
  origin: ReportOrigin | null;
  appeal_status: AppealStatus | null;
  appeal_submitted_at: string | null;
  appeal_decided_at: string | null;
  appeal_reason: string | null;
  biography_status_before_decision: string | null;
  report_type: ReportType;
  description: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  assigned_moderator_id: string | null;
  assigned_at: string | null;
  ai_analysis: AiAnalysis;
  ai_violation_level: number | null;
  decision: ModerationDecision | null;
  decision_reason: string | null;
  moderator_notes: ModeratorNotes | null;
  decided_by: string | null;
  decided_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  created_at: string;
  updated_at: string;
  biography_title: string | null;
  biography_author: string | null;
  biography_author_id: string | null;
  biography_status: string | null;
}

export interface ModerationFilters {
  status: ReportStatus | 'all';
  type: ReportType | 'all';
  sort: SortOrder;
}
