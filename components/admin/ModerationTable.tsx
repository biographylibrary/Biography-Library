'use client';

import { ModerationReport } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ReportTypeBadge } from './ReportTypeBadge';
import { ReportStatusBadge } from './ReportStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert as AlertCircle } from 'lucide-react';

interface ModerationTableProps {
  reports: ModerationReport[];
  loading: boolean;
  error: string | null;
  onOpen: (report: ModerationReport) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function ModerationTable({ reports, loading, error, onOpen }: ModerationTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{t.admin.errorLoading}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {t.admin.noReports}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs font-semibold text-muted-foreground w-28">{t.admin.colDate}</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground w-44">{t.admin.colType}</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">{t.admin.colBiography}</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground w-28">{t.admin.colStatus}</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">{t.admin.colAiSummary}</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground w-20 text-right">{t.admin.colActions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const summary = report.ai_analysis?.summary ?? '';
            const displaySummary = summary ? truncate(summary, 100) : t.admin.aiNoSummary;
            const hasTruncation = summary.length > 100;

            return (
              <TableRow key={report.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(report.created_at)}
                </TableCell>
                <TableCell>
                  <ReportTypeBadge type={report.report_type} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate max-w-xs">
                      {report.biography_title ?? t.admin.unknownBiography}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-xs">
                      {report.biography_author ?? t.admin.unknownAuthor}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ReportStatusBadge status={report.status} />
                </TableCell>
                <TableCell className="max-w-xs">
                  {hasTruncation ? (
                    <span
                      title={summary}
                      className="text-xs text-muted-foreground cursor-help leading-relaxed"
                    >
                      {displaySummary}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {displaySummary}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => onOpen(report)}
                  >
                    {t.admin.actionOpen}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
