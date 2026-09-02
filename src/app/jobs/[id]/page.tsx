'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { MatchScoreGauge } from '@/components/matching/MatchScoreGauge';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
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
  Clock,
  Briefcase,
  ExternalLink,
} from 'lucide-react';

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [matchResult, setMatchResult] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        // Check if job is saved
        supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('job_id', resolvedParams.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setIsSaved(true);
          });

        // Fetch candidate evaluation data for match score calculation
        const [seekerRes, skillsRes, eduRes] = await Promise.all([
          supabase.from('job_seeker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', user.id),
          supabase.from('educations').select('*').eq('user_id', user.id),
        ]);

        if (seekerRes.data) {
          const candidateData = {
            profile: seekerRes.data,
            skills: skillsRes.data || [],
            educations: eduRes.data || [],
          };

          // If job already loaded, calculate match
          if (job) {
            const calculated = calculateJobMatch(job, candidateData as any);
            setMatchResult(calculated);
          }
        }
      }
    });

    supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('id', resolvedParams.id)
      .maybeSingle()
      .then(async ({ data }) => {
        setJob(data);
        setLoading(false);

        // Calculate match if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user && data) {
          const [seekerRes, skillsRes, eduRes] = await Promise.all([
            supabase.from('job_seeker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', user.id),
            supabase.from('educations').select('*').eq('user_id', user.id),
          ]);

          if (seekerRes.data) {
            const calculated = calculateJobMatch(data, {
              profile: seekerRes.data,
              skills: skillsRes.data || [],
              educations: eduRes.data || [],
            } as any);
            setMatchResult(calculated);
          }
        }
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
      await supabase.from('saved_jobs').upsert(
        { user_id: userId, job_id: job.id },
        { onConflict: 'user_id,job_id' }
      );
      setIsSaved(true);
    }
  };

  const skillsList = job.required_skills || (job as any).job_skills || [];

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
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {job.company?.logo_url ? (
                      <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
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
                    <p className="text-xs text-muted flex items-center gap-2 mt-1">
                      <span>Posted {formatRelativeTime(job.created_at)}</span>
                      <span>•</span>
                      <span>{job.views || 0} views</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                  {matchResult && (
                    <div title={`${matchResult.overallScore}% AI Match`}>
                      <MatchScoreGauge score={matchResult.overallScore} size="lg" />
                    </div>
                  )}

                  <button
                    onClick={handleToggleSave}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isSaved
                        ? 'bg-mint-50 border-mint-200 text-mint-600'
                        : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                    }`}
                    title={isSaved ? 'Remove from Saved' : 'Save Job'}
                    aria-label={isSaved ? 'Remove from Saved' : 'Save Job'}
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

            {/* Why You Match AI Insights */}
            {matchResult && (
              <div className="bg-mint-50/70 rounded-3xl border border-mint-200 p-6 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-mint-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-mint-600" />
                    AI Profile Match Analysis — {matchResult.overallScore}% Fit ({matchResult.tier})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {matchResult.factors && Object.values(matchResult.factors).map((f: any, i: number) => (
                    <div key={i} className="p-2.5 bg-white/80 rounded-xl border border-mint-100 flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${f.positive ? 'bg-mint-600' : 'bg-amber-500'}`} />
                      <div>
                        <p className="font-bold text-dark">{f.name}: {f.score}%</p>
                        <p className="text-slate-600">{f.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Skills Section */}
            {skillsList.length > 0 && (
              <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
                <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Required Skills & Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill: any, i: number) => (
                    <span
                      key={skill.id || i}
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
                <div className="space-y-2 pt-2">
                  <Link href={`/companies/${job.company_id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full justify-center text-xs font-semibold">
                      View Company Profile
                    </Button>
                  </Link>
                  <Link href={`/seeker/reviews?companyId=${job.company_id}`} className="block">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-mint-700">
                      Write a Company Review
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Resume Upload Application Modal */}
      <ApplyModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        matchScore={matchResult?.overallScore || 0}
      />

      <Footer />
    </div>
  );
}
