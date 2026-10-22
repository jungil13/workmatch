import { NextRequest, NextResponse } from 'next/server';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { getAdminClient, requireRole } from '@/lib/supabase/requireUser';

export async function POST(request: NextRequest) {
  const ctx = await requireRole(['job_seeker']);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const jobId = typeof body?.jobId === 'string' ? body.jobId : '';
  const resumeDocumentId = typeof body?.resumeDocumentId === 'string' ? body.resumeDocumentId : '';
  const coverLetter = String(body?.coverLetter || '').trim().slice(0, 5000);

  if (!jobId || !resumeDocumentId) {
    return NextResponse.json({ error: 'jobId and resumeDocumentId are required.' }, { status: 400 });
  }

  const [{ data: job, error: jobError }, { data: resume, error: resumeError }] = await Promise.all([
    ctx.supabase
      .from('jobs')
      .select('*, required_skills:job_skills(*, skill:skills(*))')
      .eq('id', jobId)
      .eq('status', 'published')
      .maybeSingle(),
    ctx.supabase
      .from('documents')
      .select('id, user_id, document_type')
      .eq('id', resumeDocumentId)
      .eq('user_id', ctx.user!.id)
      .maybeSingle(),
  ]);

  if (jobError || resumeError) {
    return NextResponse.json({ error: jobError?.message || resumeError?.message }, { status: 500 });
  }
  if (!job) return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });
  if (!resume || resume.document_type !== 'resume') {
    return NextResponse.json({ error: 'Choose a resume that belongs to your account.' }, { status: 400 });
  }

  const [
    { data: profile, error: profileError },
    { data: seekerProfile, error: seekerProfileError },
    { data: skills, error: skillsError },
    { data: educations, error: educationError },
    { data: experiences, error: experienceError },
    { data: certifications, error: certificationError },
  ] = await Promise.all([
    ctx.supabase.from('profiles').select('*').eq('id', ctx.user!.id).maybeSingle(),
    ctx.supabase.from('job_seeker_profiles').select('*').eq('user_id', ctx.user!.id).maybeSingle(),
    ctx.supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', ctx.user!.id),
    ctx.supabase.from('educations').select('*').eq('user_id', ctx.user!.id),
    ctx.supabase.from('work_experiences').select('*').eq('user_id', ctx.user!.id),
    ctx.supabase.from('certifications').select('*').eq('user_id', ctx.user!.id),
  ]);

  const profileErrorMessage = [
    profileError,
    seekerProfileError,
    skillsError,
    educationError,
    experienceError,
    certificationError,
  ].find(Boolean)?.message;
  if (profileErrorMessage) {
    return NextResponse.json({ error: profileErrorMessage }, { status: 500 });
  }

  const match = calculateJobMatch(job as any, {
    profile: { ...(profile || {}), ...(seekerProfile || {}) },
    skills: skills || [],
    educations: educations || [],
    workExperiences: experiences || [],
    certifications: certifications || [],
  });

  const now = new Date().toISOString();
  const { data: application, error: applicationError } = await getAdminClient()
    .from('applications')
    .insert({
      applicant_id: ctx.user!.id,
      job_id: jobId,
      resume_document_id: resumeDocumentId,
      cover_letter: coverLetter,
      match_score: match.overallScore,
      status: 'applied',
      applied_at: now,
      updated_at: now,
    })
    .select('id, status, match_score')
    .single();

  if (applicationError) {
    if (applicationError.code === '23505') {
      return NextResponse.json({ error: 'You have already applied for this job.' }, { status: 409 });
    }
    return NextResponse.json({ error: applicationError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, application });
}
