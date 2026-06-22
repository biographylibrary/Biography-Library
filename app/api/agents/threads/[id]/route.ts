import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { verifyThreadOwnership } from '@/lib/agents/thread-service';
import { isAdminOrSuperAdmin, getCallerStaffContext } from '@/lib/server/admin-api-auth';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const threadId = params.id;
  const serviceClient = buildServiceClient();
  const thread = await verifyThreadOwnership(serviceClient, threadId, auth.userId);

  const staff = await getCallerStaffContext(req);
  const isStaff = staff && isAdminOrSuperAdmin(staff.role);

  if (!thread && !isStaff) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!thread && isStaff) {
    const { data } = await serviceClient
      .from('agent_threads')
      .select('id')
      .eq('id', threadId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await serviceClient.from('agent_threads').delete().eq('id', threadId);
  if (error) {
    console.error('[agents/threads/delete]', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
