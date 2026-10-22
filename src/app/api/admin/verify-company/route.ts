import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getAdminClient } from '@/lib/supabase/requireUser';

export async function POST(request: NextRequest) {
  const ctx = await requireRole(['admin']);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const companyId = body?.companyId as string | undefined;
  const verificationId = body?.verificationId as string | undefined;
  const status = body?.status as string | undefined;
  const notes = String(body?.notes || '').slice(0, 1000);

  if (!companyId || !['approved', 'rejected', 'resubmission_required'].includes(status || '')) {
    return NextResponse.json({ error: 'companyId and a valid status are required.' }, { status: 400 });
  }

  if (verificationId) {
    const { data: reviewedCompanyId, error } = await ctx.supabase.rpc('review_company_verification', {
      p_verification_id: verificationId,
      p_expected_company_id: companyId,
      p_status: status,
      p_notes: notes,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, companyId: reviewedCompanyId });
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();
  const { error: companyError } = await admin
    .from('companies')
    .update({
      verification_status: status,
      verification_notes: notes || null,
      verified: status === 'approved',
      verified_at: status === 'approved' ? now : null,
      verified_by: ctx.user!.id,
      updated_at: now,
    })
    .eq('id', companyId);

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: `Company verification ${status}`,
    entity_type: 'company',
    entity_id: companyId,
    metadata: { verificationId, notes, status },
    created_at: now,
  });

  if (auditError) {
    return NextResponse.json({ error: `Company status updated, but audit logging failed: ${auditError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
