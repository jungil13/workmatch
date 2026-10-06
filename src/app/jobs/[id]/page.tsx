'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  UploadCloud,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  TrendingUp,
  Users,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { trackJobInteraction } from '@/lib/services/jobTrackingService';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-orange-500',
  'bg-purple-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-amber-600',
];

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Application form states
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [selectedSavedResumeId, setSelectedSavedResumeId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial load
  useEffect(() => {
    async function loadData() {
      // 1. Fetch current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Check if saved
        const { data: savedData } = await supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('job_id', resolvedParams.id)
          .maybeSingle();
        if (savedData) setIsSaved(true);

        // Check if already applied
        const { data: appData } = await supabase
          .from('applications')
          .select('id')
          .eq('applicant_id', user.id)
          .eq('job_id', resolvedParams.id)
          .maybeSingle();
        if (appData) setHasApplied(true);

        // Fetch existing uploaded resumes
        const { data: docData } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .eq('document_type', 'resume')
          .order('uploaded_at', { ascending: false });

        if (docData && docData.length > 0) {
          setSavedResumes(docData);
          setSelectedSavedResumeId(docData[0].id);
        }
      }

      // 2. Fetch Job Details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
        .eq('id', resolvedParams.id)
        .maybeSingle();

      if (jobData) {
        setJob(jobData);
        trackJobInteraction(resolvedParams.id, { source: 'page_view' }).catch(() => {});
      }
      setLoading(false);
    }

    loadData();
  }, [resolvedParams.id]);

  // Handle Save / Unsave
  const handleToggleSave = async () => {
    if (!userId) {
      router.push(`/auth/seeker/sign-in?redirect=/jobs/${resolvedParams.id}`);
      return;
    }
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', resolvedParams.id);
      setIsSaved(false);
    } else {
      await supabase
        .from('saved_jobs')
        .upsert({ user_id: userId, job_id: resolvedParams.id }, { onConflict: 'user_id,job_id' });
      setIsSaved(true);
    }
  };

  // Handle Resume File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMessage('Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }

    setResumeFile(file);
    setSelectedSavedResumeId('');
  };

  // Submit Application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      router.push(`/auth/seeker/sign-in?redirect=/jobs/${resolvedParams.id}`);
      return;
    }

    if (!resumeFile && !selectedSavedResumeId) {
      setErrorMessage('Please upload your resume before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      let finalResumeDocId: string | null = selectedSavedResumeId || null;

      // Upload new file if provided
      if (resumeFile) {
        const sanitized = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `resumes/${userId}/${Date.now()}_${sanitized}`;

        await supabase.storage.from('documents').upload(storagePath, resumeFile, {
          cacheControl: '3600',
          upsert: true,
        });

        const { data: docData } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            document_type: 'resume',
            file_name: resumeFile.name,
            file_path: storagePath,
            mime_type: resumeFile.type || 'application/pdf',
            file_size: resumeFile.size,
            verification_status: 'verified',
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (docData) finalResumeDocId = docData.id;
      }

      // Upsert application
      const { error: appError } = await supabase.from('applications').upsert(
        {
          applicant_id: userId,
          job_id: resolvedParams.id,
          resume_document_id: finalResumeDocId,
          cover_letter: coverLetter.trim(),
          match_score: 95,
          status: 'applied',
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_id,applicant_id' }
      );

      if (appError) throw new Error(appError.message || 'Failed to submit application.');

      setSubmitSuccess(true);
      setHasApplied(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCompanyInitials = (name?: string) => {
    if (!name) return 'WM';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  const formatSalaryDisplay = (min?: number, max?: number, currency: string = 'PHP') => {
    const symbol = currency === 'USD' ? '$' : '₱';
    if (!min && !max) return `${symbol}60k - ${symbol}90k`;
    const formatK = (val: number) => {
      if (val >= 1000) return `${Math.round(val / 1000)}k`;
      return val.toLocaleString();
    };
    if (min && max && min !== max) {
      return `${symbol}${formatK(min)} - ${symbol}${formatK(max)}`;
    }
    return `${symbol}${formatK(min || max || 0)}`;
  };

  const parseBulletList = (text?: string, fallback: string[] = []): string[] => {
    if (!text) return fallback;
    const items = text
      .split(/\r?\n|•/)
      .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
      .filter((s) => s.length > 2);
    return items.length > 0 ? items : fallback;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="w-9 h-9 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800">Job Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">This job opening may have expired or was removed.</p>
          <Link
            href="/jobs"
            className="mt-4 px-5 py-2.5 rounded-full bg-[#00b074] text-white text-xs font-semibold hover:bg-[#009b66] transition-all"
          >
            ← Back to Job Listings
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const company = job.company || {};
  const initials = getCompanyInitials(company.name);
  const colorIndex = (job.id.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const avatarBg = AVATAR_COLORS[colorIndex];
  const applicantsCount = job.views ? Math.max(Math.floor(job.views / 3), 12) : 24;

  const defaultResponsibilities = [
    'Develop user-facing features using modern JavaScript frameworks',
    'Collaborate with backend developers to integrate APIs',
    'Optimize applications for maximum speed and scalability',
    'Write clean, maintainable, and well-documented code',
  ];

  const defaultQualifications = [
    '3+ years of experience in modern frontend development',
    'Strong proficiency in React, TypeScript, HTML, CSS',
    'Experience with state management tools and responsive web design',
    'Familiarity with RESTful APIs, Git workflows, and testing',
  ];

  const responsibilities = parseBulletList(job.responsibilities, defaultResponsibilities);
  const qualifications = parseBulletList(job.qualifications, defaultQualifications);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 selection:bg-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Job Listings
          </Link>
        </div>

        {/* 2-Column Layout Pixel-Matched to Reference Image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ─── LEFT COLUMN: JOB DETAILS CARD ─────────────────────── */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-7">
            {/* Header: Avatar + Title & Meta + Match Score */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b border-slate-100">
              <div className="flex items-start gap-4 min-w-0">
                {/* Company Avatar */}
                <div
                  className={`w-14 h-14 rounded-2xl ${avatarBg} text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden`}
                >
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                {/* Job Title + Company/Location + Tag Pills */}
                <div className="space-y-2 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {job.title}
                  </h1>

                  {/* Company & Location */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-normal">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {company.name || 'American Philippines'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.city || company.city || 'Quezon City'}
                    </span>
                  </div>

                  {/* Tag Pills Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100/70">
                      {job.employment_type || 'Full-time'}
                    </span>
                    <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/70">
                      {job.work_arrangement || 'Remote'}
                    </span>
                    <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100/70">
                      {job.experience_level || 'Mid-Senior'}
                    </span>
                    <span className="text-xs font-medium px-3 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Posted {job.created_at ? formatRelativeTime(job.created_at) : '2 days ago'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Score Indicator (Right side of header) */}
              <div className="text-left sm:text-right shrink-0 sm:pl-4 self-start">
                <div className="text-2xl sm:text-3xl font-black text-[#00b074] leading-none">
                  95%
                </div>
                <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-1">
                  Match Score
                </p>
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">Job Description</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {job.description ||
                  `We are looking for a ${job.title} to build scalable and high-performance web applications. You will work closely with designers, backend developers, and stakeholders to deliver great user experiences.`}
              </p>
            </div>

            {/* Responsibilities */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">Responsibilities:</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                {responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00b074] mt-2 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Qualifications */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">Qualifications:</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                {qualifications.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00b074] mt-2 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: APPLY FOR THIS JOB CARD ──────────────── */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900">Apply for this job</h3>

              {/* Salary Range */}
              <div className="space-y-0.5 pb-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  $ Salary Range
                </span>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {formatSalaryDisplay(job.salary_min, job.salary_max, job.salary_currency || 'USD')}
                </p>
                <p className="text-xs text-slate-400 font-normal">
                  Expected salary per year
                </p>
              </div>

              {/* Application Form */}
              {submitSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Application Submitted!</h4>
                  <p className="text-xs text-slate-600">
                    Your resume and details were sent to <strong>{company.name || 'the employer'}</strong>.
                  </p>
                  <Link
                    href="/jobs"
                    className="inline-block mt-2 text-xs font-semibold text-[#00b074] hover:underline"
                  >
                    Browse more jobs →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-4">
                  {/* Upload Resume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Upload Resume <span className="text-rose-500">*</span>
                      </label>
                      {savedResumes.length > 0 && (
                        <span className="text-[10px] text-[#00b074] font-medium">
                          Saved resume available
                        </span>
                      )}
                    </div>

                    {/* Hidden input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Dashed Dropzone */}
                    {resumeFile ? (
                      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#00b074] shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {resumeFile.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : selectedSavedResumeId ? (
                      <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-[#00b074] shrink-0" />
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {savedResumes.find((r) => r.id === selectedSavedResumeId)?.file_name ||
                              'Using Saved Resume'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-semibold text-[#00b074] hover:underline shrink-0"
                        >
                          Upload New
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-[#00b074] hover:bg-emerald-50/20 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-slate-600 font-medium"
                      >
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <span>PDF, DOCX (Max. 5MB)</span>
                      </div>
                    )}
                  </div>

                  {/* Cover Letter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Cover Letter</label>
                    <textarea
                      placeholder="Write a brief cover letter..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full h-28 rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:ring-1 focus:ring-[#00b074] focus:outline-none resize-none transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-normal">
                      Optional but recommended
                    </p>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* Apply Now Primary Button */}
                  <button
                    type="submit"
                    disabled={submitting || hasApplied}
                    className="w-full py-3.5 rounded-xl bg-[#00b074] hover:bg-[#009b66] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {submitting
                      ? 'Submitting Application...'
                      : hasApplied
                      ? 'Already Applied'
                      : 'Apply Now'}
                  </button>

                  {/* Save Job Button */}
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-[#00b074]" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 text-slate-400" /> Save Job
                      </>
                    )}
                  </button>

                  {/* Trust Badge */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                    <ShieldCheck className="w-4 h-4 text-[#00b074]" />
                    <span>Your application is secure and confidential</span>
                  </div>
                </form>
              )}

              {/* Bottom Meta Row */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {applicantsCount} applicants
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#00b074]">
                  <TrendingUp className="w-3.5 h-3.5" /> High demand
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
