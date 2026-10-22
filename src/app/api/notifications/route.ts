import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase/requireUser';

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  const type = String(body?.type || '').slice(0, 60);
  const title = String(body?.title || '').slice(0, 180);
  const message = String(body?.message || '').slice(0, 1000);
  const link = body?.link ? String(body.link).slice(0, 300) : null;

  if (!userId || !type || !title || !message) {
    return NextResponse.json({ error: 'Missing notification fields.' }, { status: 400 });
  }

  const isAdmin = ctx.profile?.role === 'admin';
  const isSelf = userId === ctx.user!.id;
  let allowed = isAdmin || isSelf;

  if (!allowed && ctx.profile?.role === 'employer') {
    const { data: apps } = await ctx.supabase
      .from('applications')
      .select('id, job:jobs!inner(employer_id, company_id)')
      .eq('applicant_id', userId)
      .limit(20);

    const { data: ep } = await ctx.supabase
      .from('employer_profiles')
      .select('company_id')
      .eq('user_id', ctx.user!.id)
      .maybeSingle();

    allowed = Boolean(
      (apps || []).some((a: any) => a.job?.employer_id === ctx.user!.id || a.job?.company_id === ep?.company_id)
    );
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Not allowed to notify that user.' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_link: link,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data });
}
