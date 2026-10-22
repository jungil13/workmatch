import { supabase } from '@/lib/supabase/client';

export interface ResumeDataInput {
  profile: any;
  seekerProfile: any;
  skills: any[];
  educations: any[];
  experiences: any[];
}

// Layout constants
const MARGIN_L = 18;
const MARGIN_R = 192;
const PAGE_W   = 210;

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Generate a styled PDF Blob from profile data using jsPDF (client-side only).
 */
export async function generateResumePdfBlob(data: ResumeDataInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const { profile, seekerProfile, skills = [], educations = [], experiences = [] } = data;
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'WorkMatch Candidate';
  const title    = seekerProfile?.professional_title || 'Professional Candidate';
  const location = [seekerProfile?.city, seekerProfile?.province].filter(Boolean).join(', ') || 'Philippines';
  const email    = profile?.email || '';
  const phone    = profile?.phone || '';
  const bio      = seekerProfile?.bio || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageH = (doc as any).internal.pageSize.getHeight();
  let y = 0;

  const checkPageBreak = (needed = 12) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const drawHRule = (color = '#e2e8f0', lw = 0.3) => {
    const [r, g, b] = hexToRgb(color);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(lw);
    doc.line(MARGIN_L, y, MARGIN_R, y);
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const [pr, pg, pb] = hexToRgb('#00b074');
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, PAGE_W, 54, 'F');

  // Dark accent strip
  doc.setFillColor(0, 145, 95);
  doc.rect(PAGE_W - 40, 0, 40, 54, 'F');

  y = 19;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(23);
  doc.setFont('helvetica', 'bold');
  doc.text(fullName, MARGIN_L, y);

  y += 8;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(210, 255, 235);
  doc.text(title, MARGIN_L, y);

  y += 7;
  const contactStr = [location, email, phone].filter(Boolean).join('   •   ');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 245, 220);
  doc.text(contactStr, MARGIN_L, y);

  y = 62;

  // ── PREFERENCES BAR ─────────────────────────────────────────────────────────
  const prefs: string[] = [];
  if (seekerProfile?.years_experience)           prefs.push(`${seekerProfile.years_experience} Yrs Experience`);
  if (seekerProfile?.availability)               prefs.push(seekerProfile.availability);
  if (seekerProfile?.preferred_work_arrangement) prefs.push(seekerProfile.preferred_work_arrangement);
  if (seekerProfile?.preferred_job_type)         prefs.push(seekerProfile.preferred_job_type);

  if (prefs.length > 0) {
    const [lr, lg, lb] = hexToRgb('#f1faf6');
    doc.setFillColor(lr, lg, lb);
    doc.roundedRect(MARGIN_L, y, PAGE_W - MARGIN_L * 2, 11, 2, 2, 'F');
    const [mr, mg, mb] = hexToRgb('#64748b');
    doc.setTextColor(mr, mg, mb);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(prefs.join('   |   '), PAGE_W / 2, y + 7, { align: 'center' });
    y += 17;
  }

  // ── Section heading helper ───────────────────────────────────────────────────
  const sectionHeading = (label: string) => {
    checkPageBreak(16);
    y += 5;
    const [pr2, pg2, pb2] = hexToRgb('#00b074');
    doc.setFillColor(pr2, pg2, pb2);
    doc.rect(MARGIN_L, y, 3.5, 6.5, 'F');
    doc.setTextColor(pr2, pg2, pb2);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), MARGIN_L + 6, y + 5);
    y += 9.5;
    drawHRule('#e2e8f0', 0.3);
    y += 4.5;
  };

  // ── PROFESSIONAL SUMMARY ────────────────────────────────────────────────────
  if (bio) {
    sectionHeading('Professional Summary');
    const [dr, dg, db] = hexToRgb('#334155');
    doc.setTextColor(dr, dg, db);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const bioLines = doc.splitTextToSize(bio, PAGE_W - MARGIN_L * 2);
    checkPageBreak(bioLines.length * 4.5 + 4);
    doc.text(bioLines, MARGIN_L, y);
    y += bioLines.length * 4.5 + 3;
  }

  // ── WORK EXPERIENCE ─────────────────────────────────────────────────────────
  if (experiences.length > 0) {
    sectionHeading('Work Experience');
    experiences.forEach((exp, idx) => {
      checkPageBreak(20);
      const start  = exp.start_date || '';
      const end    = exp.is_current ? 'Present' : (exp.end_date || 'Present');
      const period = start ? `${start} – ${end}` : end;

      const [pr2, pg2, pb2] = hexToRgb('#00b074');
      doc.setTextColor(pr2, pg2, pb2);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(exp.job_title || 'Role', MARGIN_L, y);

      const [mr, mg, mb] = hexToRgb('#94a3b8');
      doc.setTextColor(mr, mg, mb);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(period, MARGIN_R, y, { align: 'right' });
      y += 5;

      const [dr, dg, db] = hexToRgb('#1e293b');
      doc.setTextColor(dr, dg, db);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(exp.company_name || '', MARGIN_L, y);
      y += 4.5;

      if (exp.description) {
        const descLines = doc.splitTextToSize(exp.description, PAGE_W - MARGIN_L * 2);
        checkPageBreak(descLines.length * 4 + 4);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(descLines, MARGIN_L, y);
        y += descLines.length * 4 + 2;
      }

      if (idx < experiences.length - 1) { drawHRule('#e2e8f0', 0.15); y += 5; }
    });
    y += 2;
  }

  // ── EDUCATION ───────────────────────────────────────────────────────────────
  if (educations.length > 0) {
    sectionHeading('Education & Credentials');
    educations.forEach((edu, idx) => {
      checkPageBreak(16);
      const degree    = edu.degree || 'Degree';
      const field     = edu.field_of_study ? ` in ${edu.field_of_study}` : '';
      const school    = edu.school_name || edu.institution || 'Educational Institution';
      const startYear = edu.start_year || (edu.start_date ? new Date(edu.start_date).getFullYear() : '');
      const endYear   = edu.end_year   || (edu.end_date   ? new Date(edu.end_date).getFullYear()   : 'Present');
      const period    = startYear || endYear ? `${startYear || ''} – ${endYear || ''}` : '';

      const [pr2, pg2, pb2] = hexToRgb('#00b074');
      doc.setTextColor(pr2, pg2, pb2);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${degree}${field}`, MARGIN_L, y);

      if (period) {
        const [mr, mg, mb] = hexToRgb('#94a3b8');
        doc.setTextColor(mr, mg, mb);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(period, MARGIN_R, y, { align: 'right' });
      }
      y += 5;

      const [dr, dg, db] = hexToRgb('#1e293b');
      doc.setTextColor(dr, dg, db);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(school, MARGIN_L, y);
      y += 5;

      if (idx < educations.length - 1) { drawHRule('#e2e8f0', 0.15); y += 3; }
    });
    y += 2;
  }

  // ── SKILLS ──────────────────────────────────────────────────────────────────
  if (skills.length > 0) {
    sectionHeading('Core Skills & Competencies');
    checkPageBreak(20);

    const PILL_H   = 7;
    const PILL_PAD = 4;
    const PILL_GAP = 3;
    let sx = MARGIN_L;

    skills.forEach((s) => {
      const name  = s.skill?.name || s.name || 'Skill';
      const prof  = s.proficiency ? ` *${s.proficiency}/5` : '';
      const label = `${name}${prof}`;
      doc.setFontSize(8);
      const tw    = doc.getTextWidth(label);
      const pillW = tw + PILL_PAD * 2;

      if (sx + pillW > MARGIN_R) {
        sx = MARGIN_L;
        y += PILL_H + PILL_GAP;
        checkPageBreak(PILL_H + 4);
      }

      const [pr2, pg2, pb2] = hexToRgb('#00b074');
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(pr2, pg2, pb2);
      doc.setLineWidth(0.3);
      doc.roundedRect(sx, y - 4.5, pillW, PILL_H, 1.5, 1.5, 'FD');
      doc.setTextColor(pr2, pg2, pb2);
      doc.setFont('helvetica', 'bold');
      doc.text(label, sx + PILL_PAD, y);
      sx += pillW + PILL_GAP;
    });

    y += PILL_H + 5;
  }

  // ── FOOTER on every page ────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  const dateStr    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = (doc as any).internal.pageSize.getHeight();
    const [mr, mg, mb] = hexToRgb('#94a3b8');
    doc.setTextColor(mr, mg, mb);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(mr, mg, mb);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_L, ph - 12, MARGIN_R, ph - 12);
    doc.text(`WorkMatch Verified Resume  •  Generated ${dateStr}`, PAGE_W / 2, ph - 7, { align: 'center' });
    if (totalPages > 1) doc.text(`${p} / ${totalPages}`, MARGIN_R, ph - 7, { align: 'right' });
  }

  return doc.output('blob');
}

/**
 * Generate formatted text representation of a resume (fallback / non-browser context)
 */
export function generateResumePlainText(data: ResumeDataInput): string {
  const { profile, seekerProfile, skills = [], educations = [], experiences = [] } = data;
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'WorkMatch Candidate';
  const title    = seekerProfile?.professional_title || 'Professional Candidate';
  const location = [seekerProfile?.city, seekerProfile?.province].filter(Boolean).join(', ') || 'Philippines';
  const email    = profile?.email || '';
  const phone    = profile?.phone || '';
  const bio      = seekerProfile?.bio || '';

  let text = `======================================================================\n`;
  text += `${fullName.toUpperCase()}\n${title}\n${location} | ${email}${phone ? ` | ${phone}` : ''}\n`;
  text += `======================================================================\n\n`;

  const prefParts = [];
  if (seekerProfile?.availability)               prefParts.push(`Availability: ${seekerProfile.availability}`);
  if (seekerProfile?.preferred_work_arrangement) prefParts.push(`Arrangement: ${seekerProfile.preferred_work_arrangement}`);
  if (seekerProfile?.preferred_job_type)         prefParts.push(`Job Type: ${seekerProfile.preferred_job_type}`);
  if (seekerProfile?.years_experience)           prefParts.push(`Experience: ${seekerProfile.years_experience} Years`);
  if (prefParts.length > 0) {
    text += `CAREER PREFERENCES\n--------------------------------------------------\n${prefParts.join('  •  ')}\n\n`;
  }

  if (bio) text += `PROFESSIONAL SUMMARY\n--------------------------------------------------\n${bio}\n\n`;

  if (experiences.length > 0) {
    text += `WORK EXPERIENCE\n--------------------------------------------------\n`;
    experiences.forEach((exp) => {
      const end = exp.is_current ? 'Present' : (exp.end_date || 'Present');
      text += `${exp.job_title} | ${exp.company_name}\nPeriod: ${exp.start_date || ''} – ${end}\n`;
      if (exp.description) text += `${exp.description}\n`;
      text += `\n`;
    });
  }

  if (educations.length > 0) {
    text += `EDUCATION & CREDENTIALS\n--------------------------------------------------\n`;
    educations.forEach((edu) => {
      const degree    = edu.degree || 'Degree';
      const field     = edu.field_of_study ? ` in ${edu.field_of_study}` : '';
      const school    = edu.school_name || edu.institution || 'Educational Institution';
      const startYear = edu.start_year || (edu.start_date ? new Date(edu.start_date).getFullYear() : '');
      const endYear   = edu.end_year   || (edu.end_date   ? new Date(edu.end_date).getFullYear()   : 'Present');
      const period    = startYear || endYear ? ` (${startYear || ''} – ${endYear || ''})` : '';
      text += `${degree}${field}\n${school}${period}\n\n`;
    });
  }

  if (skills.length > 0) {
    text += `CORE SKILLS & COMPETENCIES\n--------------------------------------------------\n`;
    text += skills.map((s) => {
      const name = s.skill?.name || s.name || 'Skill';
      const prof = s.proficiency ? ` (Proficiency: ${s.proficiency}/5)` : '';
      return `${name}${prof}`;
    }).join(', ') + `\n\n`;
  }

  text += `======================================================================\nVerified WorkMatch Candidate Profile • Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n======================================================================\n`;
  return text;
}

/**
 * Check if a document record is an auto-generated resume
 */
export function isAutoGeneratedResume(doc: any): boolean {
  if (!doc) return false;
  const notes = (doc.verification_notes || '').toLowerCase();
  const name  = (doc.file_name || '').toLowerCase();
  const path  = (doc.file_path || '').toLowerCase();
  return (
    notes.includes('auto-generated') ||
    notes.includes('generated from workmatch') ||
    notes.includes('generated and verified') ||
    name.includes('generated_resume') ||
    path.includes('generated')
  );
}

/**
 * Save an auto-generated resume as a PDF to Supabase storage and documents table.
 */
export async function saveAutoGeneratedResume(userId: string, data: ResumeDataInput) {
  const safeName    = `${data.profile?.first_name || 'Candidate'}_${data.profile?.last_name || 'Resume'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName    = `${safeName}_Generated_Resume.pdf`;
  const storagePath = `resumes/${userId}/${Date.now()}_${fileName}`;

  const pdfBlob = await generateResumePdfBlob(data);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBlob, { cacheControl: '3600', contentType: 'application/pdf' });

  if (uploadError) {
    console.warn('Resume storage upload note:', uploadError.message);
    await supabase.storage
      .from('documents')
      .update(storagePath, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600' })
      .catch(() => {});
  }

  const { data: docData, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      document_type: 'resume',
      file_name: fileName,
      file_path: storagePath,
      file_size: pdfBlob.size,
      mime_type: 'application/pdf',
      verification_status: 'unverified',
      verification_notes: 'Auto-generated from WorkMatch profile data. Not admin-verified.',
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return docData;
}

/**
 * Upload a candidate resume file to Supabase storage and documents table
 */
export async function uploadResumeFile(userId: string, file: File) {
  const sanitized   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `resumes/${userId}/${Date.now()}_${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { cacheControl: '3600', contentType: file.type || 'application/octet-stream' });

  if (uploadError) {
    console.warn('Storage upload warning:', uploadError.message);
  }

  const { data: docData, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      document_type: 'resume',
      file_name: file.name,
      file_path: storagePath,
      mime_type: file.type || 'application/pdf',
      file_size: file.size,
      verification_status: 'unverified',
      verification_notes: 'Candidate uploaded resume. Not admin-verified.',
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return docData;
}

/**
 * Download a resume document.
 * - Auto-generated resumes: regenerated as a styled PDF client-side (no storage dependency).
 * - Uploaded files: downloaded from Supabase storage.
 */
export async function downloadDocument(
  docOrPath: any,
  fileName?: string,
  profileData?: ResumeDataInput,
  userId?: string
) {
  const filePath = typeof docOrPath === 'string' ? docOrPath : docOrPath?.file_path;
  const rawName  =
    fileName ||
    (typeof docOrPath === 'object' ? docOrPath?.file_name : null) ||
    filePath?.split('/')?.pop() ||
    'Resume';

  const isGen =
    (typeof docOrPath === 'object' && isAutoGeneratedResume(docOrPath)) ||
    filePath?.toLowerCase()?.includes('generated');

  // Auto-generated → always produce a fresh PDF locally
  if (isGen) {
    let resolvedData: ResumeDataInput | undefined = profileData;
    const targetUserId = userId || (typeof docOrPath === 'object' ? docOrPath?.user_id : null);

    // If profileData is missing or has missing education/experience records, fetch from Supabase
    if (targetUserId && (!resolvedData || !resolvedData.profile || !resolvedData.educations?.length || !resolvedData.experiences?.length)) {
      try {
        const [profRes, spRes, skillsRes, eduRes, expRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
          supabase.from('job_seeker_profiles').select('*').eq('user_id', targetUserId).maybeSingle(),
          supabase.from('job_seeker_skills').select('*, skill:skills(name)').eq('user_id', targetUserId),
          supabase.from('educations').select('*').eq('user_id', targetUserId).order('start_date', { ascending: false }),
          supabase.from('work_experiences').select('*').eq('user_id', targetUserId).order('start_date', { ascending: false }),
        ]);

        resolvedData = {
          profile: resolvedData?.profile || profRes.data || {},
          seekerProfile: resolvedData?.seekerProfile || spRes.data || {},
          skills: resolvedData?.skills?.length ? resolvedData.skills : (skillsRes.data || []),
          educations: resolvedData?.educations?.length ? resolvedData.educations : (eduRes.data || []),
          experiences: resolvedData?.experiences?.length ? resolvedData.experiences : (expRes.data || []),
        };
      } catch (fetchErr) {
        console.warn('Could not auto-fetch full candidate details for PDF generation:', fetchErr);
      }
    }

    if (resolvedData) {
      const pdfBlob    = await generateResumePdfBlob(resolvedData);
      const baseName   = rawName.replace(/\.[^.]+$/, '');
      const blobUrl    = URL.createObjectURL(pdfBlob);
      const a          = document.createElement('a');
      a.href           = blobUrl;
      a.download       = `${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);

      // Background re-upload to keep storage current
      if (targetUserId && filePath) {
        supabase.storage
          .from('documents')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
          .catch(() => {});
      }
      return;
    }
  }

  // Uploaded file → download from storage
  try {
    if (filePath) {
      const { data, error } = await supabase.storage.from('documents').download(filePath);
      if (!error && data) {
        const blobUrl = URL.createObjectURL(data);
        const a       = document.createElement('a');
        a.href        = blobUrl;
        a.download    = rawName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
    }

    // Fallback: signed URL
    if (filePath) {
      const { data: signedData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      if (!signError && signedData?.signedUrl) {
        window.open(signedData.signedUrl, '_blank');
        return;
      }
    }

    throw new Error('Resume file not found. Please re-upload or regenerate your resume.');
  } catch (err: any) {
    console.error('Download document error:', err);
    throw err;
  }
}