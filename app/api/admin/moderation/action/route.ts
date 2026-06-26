import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isStaffModerator } from '@/lib/server/admin-api-auth';
import type { BiographyDecisionPatch } from '@/lib/moderation/moderation-actions';
import type { ModerationDecision } from '@/lib/moderation/types';
import {
  serverClaimReportReview,
  serverFreezeBiography,
  serverSubmitDecision,
  serverTakeOwnership,
} from '@/lib/server/moderation-decide-pipeline';

type ActionBody =
  | { action: 'claim_review'; reportId: string }
  | { action: 'take_ownership'; reportId: string }
  | { action: 'freeze'; biographyId: string; reason?: string }
  | {
      action: 'decide';
      reportId: string;
      biographyId: string;
      authorId: string;
      decision: ModerationDecision;
      bioPatch: BiographyDecisionPatch | null;
      notificationMessage: string;
    };

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isStaffModerator(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  switch (body.action) {
    case 'claim_review': {
      if (!body.reportId?.trim()) {
        return NextResponse.json({ error: 'reportId required' }, { status: 400 });
      }
      const result = await serverClaimReportReview(body.reportId.trim(), ctx.userId);
      return NextResponse.json(result);
    }
    case 'take_ownership': {
      if (!body.reportId?.trim()) {
        return NextResponse.json({ error: 'reportId required' }, { status: 400 });
      }
      const result = await serverTakeOwnership(body.reportId.trim(), ctx.userId);
      return NextResponse.json(result);
    }
    case 'freeze': {
      if (!body.biographyId?.trim()) {
        return NextResponse.json({ error: 'biographyId required' }, { status: 400 });
      }
      const result = await serverFreezeBiography(body.biographyId.trim(), body.reason);
      return NextResponse.json(result);
    }
    case 'decide': {
      if (!body.reportId?.trim() || !body.biographyId?.trim() || !body.authorId?.trim() || !body.decision) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const result = await serverSubmitDecision({
        reportId: body.reportId.trim(),
        biographyId: body.biographyId.trim(),
        authorId: body.authorId.trim(),
        decision: body.decision,
        bioPatch: body.bioPatch ?? null,
        notificationMessage: body.notificationMessage ?? '',
        moderatorId: ctx.userId,
      });
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
