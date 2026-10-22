import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase/requireUser';

export async function GET(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const documentId = request.nextUrl.searchParams.get('documentId');
  const bucket = request.nextUrl.searchParams.get('bucket') || 'documents';
  const path = request.nextUrl.searchParams.get('path');

  if (!documentId && !path) {
    return NextResponse.json({ error: 'documentId or path is required.' }, { status: 400 });
  }

  const admin = getAdminClient();
  let filePath = path;
  let fileBucket = bucket;

  if (documentId) {
    const { data: doc } = await admin.from('documents').select('*').eq('id', documentId).maybeSingle();
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    const isOwner = doc.user_id === ctx.user!.id;
    const isAdmin = ctx.profile?.role === 'admin';
    let isEmployerReviewer = false;

    if (!isOwner && !isAdmin && ctx.profile?.role === 'employer') {
      const { data: apps } = await ctx.supabase
        .from('applications')
        .select('id, job:jobs!inner(employer_id, company_id)')
        .eq('applicant_id', doc.user_id)
        .limit(20);

      const employerCompanyId = await ctx.supabase
        .from('employer_profiles')
        .select('company_id')
        .eq('user_id', ctx.user!.id)
        .maybeSingle();

      isEmployerReviewer = Boolean(
        (apps || []).some((app: any) => {
          const job = app.job as any;
          if (!job) return false;
          return job.employer_id === ctx.user!.id || job.company_id === employerCompanyId?.data?.company_id;
        })
      );
    }

    if (!isOwner && !isAdmin && !isEmployerReviewer) {
      return NextResponse.json({ error: 'Not authorized to view this document.' }, { status: 403 });
    }

    filePath = doc.file_path;
    fileBucket = 'documents';
  } else if (fileBucket === 'company-documents') {
    const isAdmin = ctx.profile?.role === 'admin';
    const ownsPath = (filePath || '').startsWith(`${ctx.user!.id}/`);
    if (!isAdmin && !ownsPath) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  }

  const { data, error } = await admin.storage.from(fileBucket).createSignedUrl(filePath!, 120);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Could not create a signed URL.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
