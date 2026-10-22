import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getAdminClient } from '@/lib/supabase/requireUser';

export async function POST(request: NextRequest) {
  const ctx = await requireRole(['admin']);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const documentId = body?.documentId as string | undefined;
  const status = body?.status as string | undefined;
  const notes = String(body?.notes || '').slice(0, 1000);

  if (!documentId || !['verified', 'rejected', 'resubmission_required', 'pending'].includes(status || '')) {
    return NextResponse.json({ error: 'documentId and a valid status are required.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();

  const { data: doc, error } = await admin
    .from('documents')
    .update({
      verification_status: status,
      verification_notes: notes || null,
      verified_at: status === 'verified' ? now : null,
      reviewed_by: ctx.user!.id,
    })
    .eq('id', documentId)
    .select('id, user_id, file_name')
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: error?.message || 'Document not found.' }, { status: 500 });
  }

  if (status === 'verified' && doc.user_id) {
    await admin.from('educations').update({ verified: true }).eq('user_id', doc.user_id);
  }

  await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: `Document verification ${status}`,
    entity_type: 'document',
    entity_id: documentId,
    metadata: { file_name: doc.file_name, notes, status },
    created_at: now,
  });

  return NextResponse.json({ ok: true });
}
