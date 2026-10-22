import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase/requireUser';
import { isPendingApplication } from '@/lib/applicationStatus';

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const applicationId = body?.applicationId as string | undefined;
  const decision = body?.decision as 'accept' | 'decline' | undefined;

  if (!applicationId || !['accept', 'decline'].includes(decision || '')) {
    return NextResponse.json({ error: 'applicationId and decision are required.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: application } = await admin
    .from('applications')
    .select('*, job:jobs(id, title, employer_id, company_id)')
    .eq('id', applicationId)
    .maybeSingle();

  if (!application || application.applicant_id !== ctx.user!.id) {
    return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
  }

  if (application.status !== 'offer' && ctx.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'This application does not have an offer to respond to.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const job = application.job as any;

  if (decision === 'decline') {
    const { error: declineError } = await admin
      .from('applications')
      .update({ status: 'withdrawn', offer_responded_at: now, updated_at: now, closed_reason: 'Candidate declined offer' })
      .eq('id', applicationId);
    if (declineError) {
      return NextResponse.json({ error: declineError.message }, { status: 500 });
    }

    if (job?.employer_id) {
      await admin.rpc('create_notification', {
        p_user_id: job.employer_id,
        p_type: 'status_update',
        p_title: 'Candidate declined an offer',
        p_message: `A candidate declined the offer for "${job?.title || 'your role'}".`,
        p_link: `/employer/applicants/${applicationId}`,
      });
    }

    return NextResponse.json({ ok: true, status: 'withdrawn' });
  }

  const { data: seeker, error: seekerError } = await admin
    .from('job_seeker_profiles')
    .select('id, employment_status, hired_application_id, notify_other_employers_on_hire')
    .eq('user_id', ctx.user!.id)
    .maybeSingle();
  if (seekerError) {
    return NextResponse.json({ error: seekerError.message }, { status: 500 });
  }

  const { error: acceptError } = await ctx.supabase.rpc('accept_job_offer', {
    p_application_id: applicationId,
  });
  if (acceptError) {
    const isConflict = acceptError.message.includes('confirmed hire');
    return NextResponse.json(
      { error: acceptError.message },
      { status: isConflict ? 409 : 500 }
    );
  }

  if (job?.employer_id) {
    await admin.rpc('create_notification', {
      p_user_id: job.employer_id,
      p_type: 'status_update',
      p_title: 'Candidate accepted your offer',
      p_message: `The candidate confirmed the hire for "${job?.title || 'your role'}".`,
      p_link: `/employer/applicants/${applicationId}`,
    });
  }

  if (seeker?.notify_other_employers_on_hire !== false) {
    const { data: otherApps } = await admin
      .from('applications')
      .select('id, status, job:jobs(employer_id, title)')
      .eq('applicant_id', ctx.user!.id)
      .neq('id', applicationId);

    for (const app of otherApps || []) {
      if (!isPendingApplication(app.status)) continue;
      await admin
        .from('applications')
        .update({
          status: 'closed',
          closed_reason: 'Candidate is no longer available',
          updated_at: now,
        })
        .eq('id', app.id);

      const employerId = (app.job as any)?.employer_id;
      if (employerId) {
        await admin.rpc('create_notification', {
          p_user_id: employerId,
          p_type: 'status_update',
          p_title: 'Candidate no longer available',
          p_message:
            'A candidate with an active application is no longer available. No other employer details were shared.',
          p_link: '/employer/applicants',
        });
      }
    }
  }

  await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: 'Candidate accepted offer / hire confirmed',
    entity_type: 'application',
    entity_id: applicationId,
    metadata: { privacy: 'other employers received availability notice only' },
    created_at: now,
  });

  return NextResponse.json({ ok: true, status: 'hired' });
}
