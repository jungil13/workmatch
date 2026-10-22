import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const jobIds = Array.isArray((body as { jobIds?: unknown })?.jobIds)
    ? [...new Set((body as { jobIds: unknown[] }).jobIds.filter(
        (id): id is string => typeof id === 'string' && id.length <= 64
      ))]
    : null;

  if (!jobIds || jobIds.length > 20) {
    return NextResponse.json({ error: 'jobIds must be an array with at most 20 IDs.' }, { status: 400 });
  }
  if (jobIds.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const admin = createSupabaseAdminClient();
  const { data: publishedJobs, error: jobsError } = await admin
    .from('jobs')
    .select('id')
    .in('id', jobIds)
    .eq('status', 'published');

  if (jobsError) {
    console.error('Could not validate published jobs for applicant counts:', jobsError);
    return NextResponse.json({ error: 'Could not load applicant counts.' }, { status: 500 });
  }

  const publishedIds = (publishedJobs ?? []).map((job) => job.id);
  if (publishedIds.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const results = await Promise.all(
    publishedIds.map((jobId) =>
      admin.from('applications').select('id', { count: 'exact', head: true }).eq('job_id', jobId)
    )
  );
  const countError = results.find((result) => result.error)?.error;
  if (countError) {
    console.error('Could not count applications for published jobs:', countError);
    return NextResponse.json({ error: 'Could not load applicant counts.' }, { status: 500 });
  }

  const counts = Object.fromEntries(publishedIds.map((id, index) => [id, results[index].count ?? 0]));
  return NextResponse.json({ counts });
}
