import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [jobs, verifiedCompanies, hired] = await Promise.all([
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('moderation_status.is.null,moderation_status.eq.approved')
      .or(`application_deadline.is.null,application_deadline.gte.${today}`),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .or('verification_status.eq.approved,and(verification_status.is.null,verified.eq.true)'),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'hired'),
  ]);

  const queryError = jobs.error || verifiedCompanies.error || hired.error;
  if (queryError) {
    console.error('Could not load current platform stats:', queryError);
    return NextResponse.json(
      { error: 'Could not load platform statistics.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  return NextResponse.json(
    {
      activeJobPostings: jobs.count ?? 0,
      verifiedCompanies: verifiedCompanies.count ?? 0,
      successfulMatches: hired.count ?? 0,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
