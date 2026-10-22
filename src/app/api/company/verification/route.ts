import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireRole } from '@/lib/supabase/requireUser';
import { isHttpsUrl, normalizeHttpsUrl, validateSocialUrl } from '@/lib/urlValidation';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function GET() {
  const ctx = await requireRole(['employer']);
  if (ctx.response) return ctx.response;

  const { data: employerProfile, error: employerError } = await ctx.supabase
    .from('employer_profiles')
    .select('company_id')
    .eq('user_id', ctx.user!.id)
    .maybeSingle();

  if (employerError) {
    return NextResponse.json({ error: employerError.message }, { status: 500 });
  }
  if (!employerProfile?.company_id) {
    return NextResponse.json({ verification: null });
  }

  const admin = getAdminClient();
  const { data: verification, error } = await admin
    .from('company_verifications')
    .select('id, company_id, business_name, status, permit_file_path, permit_file_name, permit_mime_type, permit_file_size, admin_notes, created_at')
    .eq('company_id', employerProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Could not load employer business permit:', error);
    return NextResponse.json({ error: 'Could not load business permit details.' }, { status: 500 });
  }
  if (!verification) {
    return NextResponse.json({ verification: null });
  }

  const { data: signedUrl, error: signedUrlError } = await admin.storage
    .from('company-documents')
    .createSignedUrl(verification.permit_file_path, 600);

  if (signedUrlError || !signedUrl?.signedUrl) {
    console.error('Could not create employer business permit preview URL:', signedUrlError);
    return NextResponse.json({ error: 'Could not create a secure permit preview.' }, { status: 500 });
  }

  return NextResponse.json({
    verification: { ...verification, signed_url: signedUrl.signedUrl },
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(['employer', 'admin']);
  if (ctx.response) return ctx.response;

  const form = await request.formData();
  const businessName = String(form.get('businessName') || '').trim();
  const businessAddress = String(form.get('businessAddress') || '').trim();
  const contactEmail = String(form.get('contactEmail') || '').trim();
  const contactPhone = String(form.get('contactPhone') || '').trim();
  const permit = form.get('permit') as File | null;

  if (!businessName || !businessAddress || !permit) {
    return NextResponse.json({ error: 'Company name, address, and business permit file are required.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(permit.type) || permit.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Permit must be a PDF or image up to 10MB.' }, { status: 400 });
  }

  let website: string | null = null;
  let facebook: string | null = null;
  let linkedin: string | null = null;
  let instagram: string | null = null;
  let other: string | null = null;

  try {
    website = normalizeHttpsUrl(String(form.get('website') || ''));
    facebook = validateSocialUrl('facebook', String(form.get('facebookUrl') || ''));
    linkedin = validateSocialUrl('linkedin', String(form.get('linkedinUrl') || ''));
    instagram = validateSocialUrl('instagram', String(form.get('instagramUrl') || ''));
    other = normalizeHttpsUrl(String(form.get('otherSocialUrl') || ''));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const { data: ep } = await ctx.supabase
    .from('employer_profiles')
    .select('company_id')
    .eq('user_id', ctx.user!.id)
    .maybeSingle();

  if (!ep?.company_id) {
    return NextResponse.json({ error: 'Create your company profile before submitting verification.' }, { status: 400 });
  }

  const sanitized = permit.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${ctx.user!.id}/${ep.company_id}/${Date.now()}_${sanitized}`;
  const buffer = Buffer.from(await permit.arrayBuffer());

  const { error: uploadError } = await ctx.supabase.storage.from('company-documents').upload(path, buffer, {
    contentType: permit.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await ctx.supabase.from('company_verifications').insert({
    company_id: ep.company_id,
    submitted_by: ctx.user!.id,
    business_name: businessName,
    business_address: businessAddress,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    website,
    facebook_url: facebook,
    linkedin_url: linkedin,
    instagram_url: instagram,
    other_social_url: other,
    permit_file_path: path,
    permit_file_name: permit.name,
    permit_mime_type: permit.type,
    permit_file_size: permit.size,
    status: 'pending',
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: companyUpdateError } = await getAdminClient()
    .from('companies')
    .update({
      name: businessName,
      address: businessAddress,
      email: contactEmail || null,
      phone: contactPhone || null,
      website,
      facebook_url: facebook,
      linkedin_url: linkedin,
      instagram_url: instagram,
      other_social_url: other,
      verification_status: 'pending',
      verified: false,
      verified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ep.company_id);

  if (companyUpdateError) {
    console.error('Could not update company after permit submission:', companyUpdateError);
    return NextResponse.json({ error: 'Permit was submitted, but company verification status could not be updated.' }, { status: 500 });
  }

  // verification_status may be protected by trigger for non-admins; keep submission record regardless
  return NextResponse.json({
    ok: true,
    message: 'Documents submitted. Verification happens only after an administrator reviews this submission.',
  });
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireRole(['employer', 'admin']);
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const verificationId = typeof body?.verificationId === 'string' ? body.verificationId : '';
  if (!verificationId) {
    return NextResponse.json({ error: 'verificationId is required.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: verification, error: verificationError } = await admin
    .from('company_verifications')
    .select('id, company_id, submitted_by, permit_file_path, status')
    .eq('id', verificationId)
    .maybeSingle();

  if (verificationError) {
    return NextResponse.json({ error: verificationError.message }, { status: 500 });
  }
  if (!verification) {
    return NextResponse.json({ error: 'Business permit submission not found.' }, { status: 404 });
  }

  if (ctx.profile?.role !== 'admin') {
    const { data: employerProfile, error: employerError } = await ctx.supabase
      .from('employer_profiles')
      .select('company_id')
      .eq('user_id', ctx.user!.id)
      .maybeSingle();

    if (employerError) {
      return NextResponse.json({ error: employerError.message }, { status: 500 });
    }
    if (employerProfile?.company_id !== verification.company_id) {
      return NextResponse.json({ error: 'You are not authorized to delete this permit.' }, { status: 403 });
    }
  }

  const { error: storageError } = await admin.storage
    .from('company-documents')
    .remove([verification.permit_file_path]);

  if (storageError) {
    console.error('Could not delete business permit file:', storageError);
    return NextResponse.json({ error: 'Could not delete the stored permit file.' }, { status: 500 });
  }

  const { error: deleteError } = await admin
    .from('company_verifications')
    .delete()
    .eq('id', verification.id);

  if (deleteError) {
    console.error('Could not delete business permit record:', deleteError);
    return NextResponse.json({ error: 'The permit file was removed, but its submission record could not be deleted.' }, { status: 500 });
  }

  {
    const { data: latestVerification, error: latestError } = await admin
      .from('company_verifications')
      .select('status, admin_notes, reviewed_at')
      .eq('company_id', verification.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error('Could not check remaining permit submissions:', latestError);
      return NextResponse.json({ error: 'Permit deleted, but company verification status could not be refreshed.' }, { status: 500 });
    }

    const status = latestVerification?.status || 'unverified';
    const { error: companyError } = await admin
      .from('companies')
      .update({
        verification_status: status,
        verification_notes: latestVerification?.admin_notes || null,
        verified: status === 'approved',
        verified_at: status === 'approved' ? latestVerification?.reviewed_at : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.company_id);

    if (companyError) {
      console.error('Could not refresh company verification after permit deletion:', companyError);
      return NextResponse.json({ error: 'Permit deleted, but company verification status could not be refreshed.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export { isHttpsUrl };
