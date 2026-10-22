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
  } else if (doc.user_id) {
    // If not verified (rejected, resubmission, pending), check if user still has any other verified document
    const { data: otherVerified } = await admin
      .from('documents')
      .select('id')
      .eq('user_id', doc.user_id)
      .eq('verification_status', 'verified')
      .neq('id', documentId)
      .limit(1);

    if (!otherVerified || otherVerified.length === 0) {
      await admin.from('educations').update({ verified: false }).eq('user_id', doc.user_id);
    }
  }

  await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: `Document verification ${status}`,
    entity_type: 'document',
    entity_id: documentId,
    metadata: { file_name: doc.file_name, notes, status },
    created_at: now,
  });

  // Notify the document owner of the admin's decision
  if (doc.user_id) {
    const isVerified = status === 'verified';
    await admin.rpc('create_notification', {
      p_user_id: doc.user_id,
      p_type: 'document',
      p_title: isVerified ? 'Credential verified! ✅' : 'Credential review update',
      p_message: isVerified
        ? `Your document "${doc.file_name}" has been approved. Your profile now has a verified credential badge.`
        : `Your document "${doc.file_name}" was not approved. Reason: ${notes || 'See admin notes.'}`,
      p_link: '/seeker/diploma',
    });
  }

  return NextResponse.json({ ok: true });
}
