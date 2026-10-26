import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase/requireUser';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, isPendingApplication } from '@/lib/applicationStatus';

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const applicationId = body?.applicationId as string | undefined;
  const statusValue = typeof body?.status === 'string' ? body.status : '';
  const notes = String(body?.notes || '').slice(0, 500);

  if (!applicationId || !APPLICATION_STATUSES.includes(statusValue as (typeof APPLICATION_STATUSES)[number])) {
    return NextResponse.json({ error: 'applicationId and a valid status are required.' }, { status: 400 });
  }
  const status = statusValue as (typeof APPLICATION_STATUSES)[number];

  const admin = getAdminClient();
  const { data: application, error: applicationError } = await admin
    .from('applications')
    .select('*, job:jobs(id, title, employer_id, company_id)')
    .eq('id', applicationId)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 });
  }
  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const job = application.job as any;
  const isAdmin = ctx.profile?.role === 'admin';
  const isApplicant = application.applicant_id === ctx.user!.id;
  const { data: ep, error: employerProfileError } = await ctx.supabase
    .from('employer_profiles')
    .select('company_id')
    .eq('user_id', ctx.user!.id)
    .maybeSingle();
  if (employerProfileError) {
    return NextResponse.json({ error: employerProfileError.message }, { status: 500 });
  }
  const isEmployer = job?.employer_id === ctx.user!.id || (ep?.company_id && job?.company_id === ep.company_id);

  if (!isAdmin && !isEmployer && !isApplicant) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  if (isApplicant && !['withdrawn'].includes(status) && !isAdmin) {
    return NextResponse.json({ error: 'Candidates can only withdraw an application from this endpoint.' }, { status: 403 });
  }

  if (isEmployer && !isAdmin) {
    const [{ data: seeker, error: seekerError }, { data: otherHire, error: otherHireError }] = await Promise.all([
      admin
        .from('job_seeker_profiles')
        .select('employment_status, hired_application_id')
        .eq('user_id', application.applicant_id)
        .maybeSingle(),
      admin
        .from('applications')
        .select('id')
        .eq('applicant_id', application.applicant_id)
        .eq('status', 'hired')
        .neq('id', applicationId)
        .limit(1)
        .maybeSingle(),
    ]);
    if (seekerError || otherHireError) {
      return NextResponse.json({ error: seekerError?.message || otherHireError?.message }, { status: 500 });
    }

    const hireConfirmedOnApplication = application.status === 'hired';
    const rejectedApplication = application.status === 'rejected';
    const hiredElsewhere =
      (seeker?.employment_status === 'hired' && seeker.hired_application_id !== applicationId) ||
      Boolean(otherHire);
    if (hireConfirmedOnApplication || hiredElsewhere || rejectedApplication) {
      return NextResponse.json(
        {
          error: hireConfirmedOnApplication
            ? 'This hire is already confirmed. The application status is locked.'
            : rejectedApplication
            ? 'This application has been rejected. The status cannot be changed.'
            : 'This candidate has already accepted an offer elsewhere. Their application status is locked.',
        },
        { status: 409 }
      );
    }
  }

  if (status === 'hired' && !isAdmin) {
    return NextResponse.json(
      { error: 'Hiring is confirmed only when the candidate accepts an offer.' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('applications')
    .update({
      status,
      updated_at: now,
      closed_reason: notes || null,
      recruiter_notes: notes || null,
    })
    .eq('id', applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: `Application status -> ${status}`,
    entity_type: 'application',
    entity_id: applicationId,
    metadata: { notes, label: APPLICATION_STATUS_LABELS[status] || status },
    created_at: now,
  });

  return NextResponse.json({
    ok: true,
    status,
    ...(auditError ? { warning: `Status updated, but audit logging failed: ${auditError.message}` } : {}),
  });
}

export { isPendingApplication };
