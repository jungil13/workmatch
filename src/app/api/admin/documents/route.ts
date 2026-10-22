import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireRole } from '@/lib/supabase/requireUser';

export async function GET() {
  const ctx = await requireRole(['admin']);
  if (ctx.response) return ctx.response;

  const admin = getAdminClient();
  const { data: documents, error } = await admin
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Admin document queue query failed:', error);
    return NextResponse.json({ error: 'Could not load the document verification queue.' }, { status: 500 });
  }

  const userIds = [...new Set((documents || []).map((document) => document.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await admin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error('Admin document profile lookup failed:', profilesError);
    return NextResponse.json({ error: 'Could not load document owner details.' }, { status: 500 });
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return NextResponse.json({
    documents: (documents || []).map((document) => ({
      ...document,
      profile: profileById.get(document.user_id) || null,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireRole(['admin']);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: document, error: lookupError } = await admin
    .from('documents')
    .select('id, file_path, file_name')
    .eq('id', documentId)
    .maybeSingle();

  if (lookupError) {
    console.error('Admin document delete lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not load the document to delete.' }, { status: 500 });
  }
  if (!document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  const { error: deleteError } = await admin.from('documents').delete().eq('id', documentId);
  if (deleteError) {
    console.error('Admin document record delete failed:', deleteError);
    return NextResponse.json({ error: 'Could not delete the document record.' }, { status: 500 });
  }

  const warnings: string[] = [];
  const { error: storageError } = await admin.storage.from('documents').remove([document.file_path]);
  if (storageError) {
    console.error('Admin document storage cleanup failed:', storageError);
    warnings.push('The document record was deleted, but the stored file could not be removed.');
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: ctx.user!.id,
    action: 'Document deleted by administrator',
    entity_type: 'document',
    entity_id: documentId,
    metadata: { file_name: document.file_name },
    created_at: new Date().toISOString(),
  });
  if (auditError) {
    console.error('Admin document deletion audit logging failed:', auditError);
    warnings.push('The document was deleted, but the audit record could not be written.');
  }

  return NextResponse.json({ ok: true, warnings });
}
