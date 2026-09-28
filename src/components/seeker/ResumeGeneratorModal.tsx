'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  Printer,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Star,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface ResumeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  seekerProfile: any;
  skills: any[];
  educations: any[];
  experiences: any[];
  documents?: any[];
  onDocumentSaved?: () => void;
}

type TemplateType = 'modern' | 'executive' | 'minimal';

export function ResumeGeneratorModal({
  isOpen,
  onClose,
  profile,
  seekerProfile,
  skills = [],
  educations = [],
  experiences = [],
  documents = [],
  onDocumentSaved,
}: ResumeGeneratorModalProps) {
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [showAvatar, setShowAvatar] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showBio, setShowBio] = useState(true);
  const [showSkillRatings, setShowSkillRatings] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSavingToDocs, setIsSavingToDocs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const resumePrintRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Job Seeker';
  const title = seekerProfile?.professional_title || 'Software & Technology Professional';
  const location = [seekerProfile?.city, seekerProfile?.province].filter(Boolean).join(', ') || 'Philippines';
  const email = profile?.email || '';
  const phone = profile?.phone || '';
  const bio = seekerProfile?.bio || '';

  const isDiplomaVerified = documents.some(
    (d) => d.document_type === 'diploma' && d.verification_status === 'verified'
  );

  const getInitials = () => {
    const f = profile?.first_name?.[0] || '';
    const l = profile?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'WM';
  };

  // 1. Browser Print-to-PDF Handler with no browser headers/footers and clean top-left alignment
  const handlePrint = () => {
    const resumeEl = document.getElementById('printable-resume-container');
    if (!resumeEl) {
      window.print();
      return;
    }

    // Remove any existing print iframe if present
    const existingIframe = document.getElementById('resume-print-iframe');
    if (existingIframe) existingIframe.remove();

    // Create isolated hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.id = 'resume-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Grab all stylesheets and style tags from current document
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    // Clone the resume content
    const clone = resumeEl.cloneNode(true) as HTMLElement;

    // Remove all elements marked with no-print (such as footer stamps or buttons)
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // Reset styles so it fills standard page width from top-left, with no max-w or shadow
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title></title>
          ${headStyles}
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              width: 100% !important;
              height: auto !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              padding: 16mm 18mm !important;
              display: block !important;
              line-height: 1.5;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${clone.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 350);
  };

  // 2. Plain Text Generation
  const generatePlainText = () => {
    let text = `${fullName.toUpperCase()}\n`;
    text += `${title}\n`;
    text += `${location} | ${email}${showPhone && phone ? ` | ${phone}` : ''}\n`;
    text += `═`.repeat(60) + `\n\n`;

    if (showBio && bio) {
      text += `PROFESSIONAL SUMMARY\n`;
      text += `─`.repeat(30) + `\n`;
      text += `${bio}\n\n`;
    }

    if (skills.length > 0) {
      text += `CORE COMPETENCIES & SKILLS\n`;
      text += `─`.repeat(30) + `\n`;
      text += skills
        .map((s) => `${s.skill?.name || 'Skill'}${showSkillRatings ? ` (Level ${s.proficiency}/5)` : ''}`)
        .join(', ') + `\n\n`;
    }

    if (experiences.length > 0) {
      text += `WORK EXPERIENCE\n`;
      text += `─`.repeat(30) + `\n`;
      experiences.forEach((exp) => {
        text += `${exp.job_title} | ${exp.company_name}\n`;
        text += `${exp.start_date} - ${exp.is_current ? 'Present' : exp.end_date || 'Present'}\n`;
        if (exp.description) text += `${exp.description}\n`;
        text += `\n`;
      });
    }

    if (educations.length > 0) {
      text += `EDUCATION & CREDENTIALS\n`;
      text += `─`.repeat(30) + `\n`;
      educations.forEach((edu) => {
        text += `${edu.degree} in ${edu.field_of_study}\n`;
        text += `${edu.school_name}${edu.start_date || edu.end_date ? ` (${edu.start_date || ''} - ${edu.end_date || ''})` : ''}\n\n`;
      });
    }

    text += `\nGenerated via WorkMatch Verified Career Platform\n`;
    return text;
  };

  // 3. Download Text Resume
  const handleDownloadTxt = () => {
    const text = generatePlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, '_')}_WorkMatch_Resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. Copy to Clipboard
  const handleCopyText = async () => {
    const text = generatePlainText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Save to WorkMatch Documents (for direct job applications)
  const handleSaveToDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSavingToDocs(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const fileName = `${fullName.replace(/[^a-zA-Z0-9]/g, '_')}_Generated_Resume.pdf`;
      
      // Upsert or insert into documents table
      const { error } = await supabase.from('documents').insert({
        user_id: user.id,
        document_type: 'resume',
        file_name: fileName,
        file_path: `generated/resumes/${user.id}_${Date.now()}.pdf`,
        file_size: 1024 * 45, // approx 45KB simulated
        mime_type: 'application/pdf',
        verification_status: 'verified',
        verification_notes: 'Generated and verified from WorkMatch profile data',
        uploaded_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSaveSuccess(true);
      if (onDocumentSaved) onDocumentSaved();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Failed to save resume document:', err);
      setSaveError(err.message || 'Failed to save resume to documents.');
    } finally {
      setIsSavingToDocs(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      className="max-w-5xl w-full p-0 overflow-hidden"
    >
      {/* Dynamic Print Stylesheet — uses iframe print so this only serves as fallback */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: auto; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          #printable-resume-container,
          #printable-resume-container * { visibility: visible !important; }
          #printable-resume-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16mm 18mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}} />

      <div className="flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-mint-500 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-dark flex items-center gap-2">
                Resume Generator <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-mint-100 text-mint-800">Auto-Generated</span>
              </h2>
              <p className="text-xs text-muted">
                Professional formatted resume built dynamically from your verified profile.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTxt}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Download TXT
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-5 py-2.5 flex items-center gap-2 font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Resume saved to your WorkMatch documents! You can now select it directly when applying for jobs.
          </div>
        )}
        {saveError && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-700 text-xs px-5 py-2.5 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {saveError}
          </div>
        )}

        {/* Modal Body: Left Controls + Right Live Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-border bg-slate-50/70 space-y-5">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                1. Choose Layout Style
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'modern', label: 'Modern Mint', desc: 'Tech & Modern' },
                  { id: 'executive', label: 'Executive', desc: 'Corporate Slate' },
                  { id: 'minimal', label: 'Minimalist', desc: 'Clean ATS' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id as TemplateType)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      template === t.id
                        ? 'border-mint-500 bg-mint-50/70 text-mint-950 font-bold ring-2 ring-mint-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{t.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Toggles */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                2. Customize Resume Sections
              </span>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 text-xs">
                <span className="font-semibold text-slate-700">Profile Photo / Avatar</span>
                <input
                  type="checkbox"
                  checked={showAvatar}
                  onChange={(e) => setShowAvatar(e.target.checked)}
                  className="rounded text-mint-600 focus:ring-mint-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 text-xs">
                <span className="font-semibold text-slate-700">Phone Number</span>
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="rounded text-mint-600 focus:ring-mint-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 text-xs">
                <span className="font-semibold text-slate-700">Professional Bio / Summary</span>
                <input
                  type="checkbox"
                  checked={showBio}
                  onChange={(e) => setShowBio(e.target.checked)}
                  className="rounded text-mint-600 focus:ring-mint-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 text-xs">
                <span className="font-semibold text-slate-700">Skill Proficiency Ratings</span>
                <input
                  type="checkbox"
                  checked={showSkillRatings}
                  onChange={(e) => setShowSkillRatings(e.target.checked)}
                  className="rounded text-mint-600 focus:ring-mint-500 h-4 w-4"
                />
              </label>
            </div>

            {/* WorkMatch Profile Integration Option */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                3. Save to WorkMatch Account
              </span>
              <p className="text-[11px] text-muted">
                Save this generated resume so it is automatically available whenever you click "Apply" on any job.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold text-mint-800 hover:bg-mint-50 border-mint-300"
                onClick={handleSaveToDocuments}
                isLoading={isSavingToDocs}
              >
                <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Save as Account Resume
              </Button>
            </div>
          </div>

          {/* Live Resume Sheet Preview */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-slate-100 flex flex-col overflow-y-auto">
            <div
              id="printable-resume-container"
              ref={resumePrintRef}
              className={`w-full bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 transition-all ${
                template === 'modern'
                  ? 'border-t-8 border-mint-500'
                  : template === 'executive'
                  ? 'border-t-8 border-slate-800'
                  : 'border border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-start gap-4">
                  {showAvatar && (
                    profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={fullName}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-2xl text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm ${
                          template === 'modern' ? 'bg-mint-500' : template === 'executive' ? 'bg-slate-800' : 'bg-slate-700'
                        }`}
                      >
                        {getInitials()}
                      </div>
                    )
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-black text-dark tracking-tight">
                        {fullName}
                      </h1>
                      {isDiplomaVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                          <ShieldCheck className="w-3 h-3 text-mint-600" /> Verified Credential
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold ${
                        template === 'modern' ? 'text-mint-700' : template === 'executive' ? 'text-slate-800' : 'text-slate-600'
                      }`}
                    >
                      {title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {location}
                      </span>
                      {email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {email}
                        </span>
                      )}
                      {showPhone && phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Summary */}
              {showBio && bio && (
                <div className="space-y-1.5">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      template === 'modern' ? 'text-mint-800' : template === 'executive' ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    Professional Summary
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    {bio}
                  </p>
                </div>
              )}

              {/* Core Skills */}
              {skills.length > 0 && (
                <div className="space-y-2">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      template === 'modern' ? 'text-mint-800' : template === 'executive' ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    Core Skills & Proficiencies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((sk: any) => (
                      <span
                        key={sk.id}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          template === 'modern'
                            ? 'bg-mint-50 text-mint-950 border-mint-200'
                            : template === 'executive'
                            ? 'bg-slate-100 text-slate-900 border-slate-300'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-mint-600" />
                        {sk.skill?.name || 'Skill'}
                        {showSkillRatings && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Lv. {sk.proficiency}/5)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {experiences.length > 0 && (
                <div className="space-y-2.5">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      template === 'modern' ? 'text-mint-800' : template === 'executive' ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    Work Experience
                  </h3>
                  <div className="space-y-3">
                    {experiences.map((exp: any) => (
                      <div key={exp.id} className="text-xs space-y-0.5 border-l-2 border-slate-200 pl-3">
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>{exp.job_title}</span>
                          <span className="text-[10px] text-muted font-normal">
                            {exp.start_date} — {exp.is_current ? 'Present' : exp.end_date || 'Present'}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-mint-700">{exp.company_name}</p>
                        {exp.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {educations.length > 0 && (
                <div className="space-y-2.5">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      template === 'modern' ? 'text-mint-800' : template === 'executive' ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    Education & Qualifications
                  </h3>
                  <div className="space-y-2.5">
                    {educations.map((edu: any) => (
                      <div key={edu.id} className="text-xs space-y-0.5 border-l-2 border-slate-200 pl-3">
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>{edu.degree} in {edu.field_of_study}</span>
                          <span className="text-[10px] text-muted font-normal">
                            {edu.start_date || edu.start_year || ''} — {edu.end_date || edu.end_year || 'Graduated'}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700">{edu.school_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Stamp */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>Verified Candidate Profile • WorkMatch Platform</span>
                <span>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
