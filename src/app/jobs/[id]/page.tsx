'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatRelativeTime } from '@/lib/utils';
import {
  MapPin,
  Building2,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Send,
} from 'lucide-react';

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from('saved_jobs').select('id').eq('user_id', user.id).eq('job_id', resolvedParams.id).maybeSingle().then(({ data }) => {
          if (data) setIsSaved(true);
        });
      }
    });

    supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('id', resolvedParams.id)
      .maybeSingle()
      .then(({ data }) => {
        setJob(data);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-dark">Job Not Found</h2>
          <p className="text-xs text-muted mt-1">This job posting may have expired or been removed.</p>
          <Link href="/jobs" className="mt-4">
            <Button variant="primary" size="sm">
              Back to Job Search
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const handleToggleSave = async () => {
    if (!userId) {
      router.push('/auth/seeker/sign-in');
      return;
    }
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', job.id);
      setIsSaved(false);
    } else {
      await supabase.from('saved_jobs').upsert({ user_id: userId, job_id: job.id, saved_at: new Date().toISOString() });
      setIsSaved(true);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      router.push('/auth/seeker/sign-in');
      return;
    }
    setIsApplying(true);

    await supabase.from('applications').insert({
      applicant_id: userId,
      job_id: job.id,
      cover_letter: coverLetter,
      status: 'applied',
      match_score: 0,
      applied_at: new Date().toISOString(),
    });

    setIsApplying(false);
    setAppliedSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/jobs" className="hover:text-dark flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">{job.company?.name}</span>
          <span>/</span>
          <span className="truncate max-w-xs">{job.title}</span>
        </div>

        {/* Main 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {job.company?.logo_url ? (
                      <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/companies/${job.company_id}`}
                      className="text-xs font-bold text-mint-700 hover:underline flex items-center gap-1"
                    >
                      {job.company?.name}
                      {job.company?.verified && <ShieldCheck className="w-4 h-4 text-mint-600" />}
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight mt-0.5">
                      {job.title}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleToggleSave}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isSaved
                        ? 'bg-mint-50 border-mint-200 text-mint-600'
                        : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                    }`}
                    title={isSaved ? 'Remove from Saved' : 'Save Job'}
                  >
                    {isSaved ? <BookmarkCheck className="w-5 h-5 text-mint-600" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!userId) {
                        router.push('/auth/seeker/sign-in');
                      } else {
                        setIsApplyModalOpen(true);
                      }
                    }}
                    className="shadow-sm font-bold"
                  >
                    Apply Now
                  </Button>
                </div>
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-4 border-t border-border text-xs text-muted">
                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <MapPin className="w-4 h-4 text-mint-600" />
                  {job.city || 'Remote'}
                </span>

                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />

                <span className="font-extrabold text-dark text-sm text-mint-700">
                  {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                </span>

                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />

                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                  {job.work_arrangement}
                </span>

                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                  {job.experience_level}
                </span>

                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                  {job.employment_type}
                </span>
              </div>
            </div>

            {/* Required Skills Section */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
                <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Required Skills & Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill: any) => (
                    <span
                      key={skill.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-mint-50 text-mint-900 border border-mint-200 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-mint-600" />
                      {skill.name || skill.skill?.name || 'Skill'} (Min. Level {skill.minimum_proficiency || 3}/5)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description & Responsibilities */}
            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
              {job.description && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-dark">Job Overview</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.description}
                  </p>
                </div>
              )}

              {job.responsibilities && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <h3 className="text-base font-bold text-dark">Key Responsibilities</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.responsibilities}
                  </p>
                </div>
              )}

              {job.qualifications && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <h3 className="text-base font-bold text-dark">Qualifications & Background</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.qualifications}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Company summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {job.company?.logo_url ? (
                    <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dark">{job.company?.name || 'Company'}</h4>
                  <p className="text-xs text-muted">{job.company?.industry}</p>
                </div>
              </div>

              {job.company?.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {job.company.description}
                </p>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted">Office Location</span>
                <span className="font-semibold text-dark">{job.company?.city || job.city || 'Philippines'}</span>
              </div>

              {job.company_id && (
                <Link href={`/companies/${job.company_id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    View Company Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Quick Job Application Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`Apply for ${job.title}`}
        description={`Submitting application to ${job.company?.name || 'the employer'}`}
      >
        {appliedSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-mint-100 text-mint-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-dark">Application Submitted!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Your profile and credentials were sent directly to the employer.
            </p>
            <div className="pt-3 flex gap-2 justify-center">
              <Link href="/seeker/applications">
                <Button variant="primary" size="sm">
                  View in Applications Pipeline
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Cover Note / Message to Recruiter (Optional)
              </label>
              <textarea
                rows={4}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Share why you are interested in this role and your availability..."
                className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isApplying}>
                <Send className="w-3.5 h-3.5" /> Submit Application
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Footer />
    </div>
  );
}
