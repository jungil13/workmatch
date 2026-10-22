import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase/requireUser';

/**
 * POST /api/documents/notify-upload
 * Called by the seeker client after uploading a document.
 * Notifies all admins using the service-role client (bypasses RLS).
 */
export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName : 'document';
  const documentType = typeof body?.documentType === 'string' ? body.documentType : 'document';

  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required.' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Get all admin profiles
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (!adminProfiles || adminProfiles.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const docLabel = String(documentType).replace(/_/g, ' ');
  const link = `/admin/documents?documentId=${documentId}`;
  const title = 'New credential uploaded for review';
  const message = `A job seeker uploaded a new ${docLabel} (${fileName}) and is awaiting verification.`;

  let notified = 0;
  for (const adminProfile of adminProfiles) {
    const { error } = await admin.rpc('create_notification', {
      p_user_id: adminProfile.id,
      p_type: 'document',
      p_title: title,
      p_message: message,
      p_link: link,
    });
    if (!error) notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
