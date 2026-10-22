import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/requireUser';

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const jobId = body?.jobId as string | undefined;
  const companyId = body?.companyId as string | undefined;
  const reason = String(body?.reason || '').trim().slice(0, 120);
  const description = String(body?.description || '').trim().slice(0, 2000);

  if (!reason || !description || (!jobId && !companyId)) {
    return NextResponse.json({ error: 'Provide a reason, description, and a job or company.' }, { status: 400 });
  }

  const { error } = await ctx.supabase.from('reports').insert({
    reported_by: ctx.user!.id,
    job_id: jobId || null,
    company_id: companyId || null,
    reason,
    description,
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
