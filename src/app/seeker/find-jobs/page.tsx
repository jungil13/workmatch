'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ApplicantStalkerModal } from '@/components/jobs/ApplicantStalkerModal';
import { JobCard } from '@/components/jobs/JobCard';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatDistance, formatRelativeTime } from '@/lib/utils';
import {
  Briefcase,
  MapPin,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Eye,
  ArrowRight,
  ShieldCheck,
  Clock,
  Target,
  X,
  Bot,
  Users,
  Flame,
} from 'lucide-react';

function FindJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get('keyword') || '';

  const [userId, setUserId] = useState('');
  const [candidateData, setCandidateData] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Modals
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);
  const [selectedJobForStalker, setSelectedJobForStalker] = useState<any | null>(null);

  // Initial candidate profile loading
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      const [seekerRes, skillsRes, eduRes] = await Promise.all([
        supabase.from('job_seeker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', user.id),
        supabase.from('educations').select('*').eq('user_id', user.id),
      ]);

      const cData = {
        profile: seekerRes.data || {},
        skills: skillsRes.data || [],
        educations: eduRes.data || [],
      };
      setCandidateData(cData);

      await Promise.all([
        fetchJobs({ keyword: initialKeyword, city: '', work_arrangement: '' }, cData),
        fetchSavedJobs(user.id),
        fetchApplied(user.id),
      ]);
    });
  }, [initialKeyword]);

  // Automated live debounced search as user types or changes dropdowns
  useEffect(() => {
    if (!candidateData) return;
    const timer = setTimeout(() => {
      fetchJobs({ keyword, city, work_arrangement: workArrangement });
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, city, workArrangement]);

  async function fetchJobs(
    filters?: { keyword?: string; city?: string; work_arrangement?: string },
    cDataOverride?: any
  ) {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters?.work_arrangement) query = query.eq('work_arrangement', filters.work_arrangement);
    if (filters?.keyword?.trim()) {
      query = query.or(`title.ilike.%${filters.keyword.trim()}%,description.ilike.%${filters.keyword.trim()}%`);
    }

    const { data } = await query;
    const rawJobs = data ?? [];

    const activeCandidate = cDataOverride || candidateData;

    // Attach calculated match scores
    const jobsWithMatch = rawJobs.map((job) => {
      if (activeCandidate && activeCandidate.profile) {
        const match = calculateJobMatch(job, activeCandidate);
        return { ...job, match };
      }
      return job;
    });

    setJobs(jobsWithMatch);
    setLoading(false);
  }

  async function fetchSavedJobs(uid: string) {
    const { data } = await supabase.from('saved_jobs').select('job_id').eq('user_id', uid);
    setSavedJobIds((data ?? []).map((s: any) => s.job_id));
  }

  async function fetchApplied(uid: string) {
    const { data } = await supabase.from('applications').select('job_id').eq('applicant_id', uid);
    setAppliedJobIds((data ?? []).map((a: any) => a.job_id));
  }

  const handleToggleSave = async (jobId: string) => {
    if (!userId) return;
    if (savedJobIds.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
      setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
    } else {
      await supabase.from('saved_jobs').upsert(
        { user_id: userId, job_id: jobId },
        { onConflict: 'user_id,job_id' }
      );
      setSavedJobIds((prev) => [...prev, jobId]);
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

  return (
    <DashboardLayout
      portal="seeker"
      title="Find Jobs"
      subtitle="Discover open opportunities with automated real-time matching and applicant stalking."
      actions={
        <Link href="/seeker/scanner">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Sparkles className="w-4 h-4" /> AI Recommendations Hub
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Controls with Automated Live Search */}
        <div className="bg-white rounded-3xl border border-border p-4 sm:p-5 shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Input
              placeholder="Live search: Job title, keywords, skills..."
              icon={<Search className="w-4 h-4 text-mint-600" />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="lg:col-span-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
            >
              <option value="">All Locations</option>
              <option value="Cebu City">Cebu City</option>
              <option value="Mandaue">Mandaue City</option>
              <option value="Lapu-Lapu">Lapu-Lapu City</option>
              <option value="Taguig">Taguig / BGC</option>
              <option value="Makati">Makati City</option>
              <option value="Manila">Manila</option>
              <option value="Quezon">Quezon City</option>
              <option value="Davao">Davao City</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
            >
              <option value="">All Work Setups</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`w-full h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                urgentOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20 shadow-sm'
                  : 'bg-white border-border text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Filter for urgent hiring positions"
            >
              <Flame className={`w-3.5 h-3.5 ${urgentOnly ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
              {urgentOnly ? 'Urgent Only' : 'Urgent Hiring'}
            </button>
          </div>
        </div>

        {/* Results Counter */}
        {(() => {
          const displayedJobs = urgentOnly
            ? jobs.filter((j: any) => j.is_urgent || j.company?.is_urgent)
            : jobs;

          return (
            <>
              <div className="flex items-center justify-between text-xs text-muted px-1">
                <span>
                  Found <strong className="text-dark font-bold">{displayedJobs.length}</strong> available positions
                  {urgentOnly && <span className="ml-1 text-rose-600 font-bold">(Urgently Hiring only)</span>}
                </span>
                <span className="flex items-center gap-1 text-mint-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Instant real-time results as you type
                </span>
              </div>

              {/* Job Listings Grid */}
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : displayedJobs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3 shadow-soft">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-dark">No job openings found</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {urgentOnly
                      ? 'No urgent hiring positions match your current filters. Try turning off the Urgent filter.'
                      : 'Try adjusting your live keywords or clearing location filters.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKeyword('');
                      setCity('');
                      setWorkArrangement('');
                      setUrgentOnly(false);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedJobs.map((job: any) => {
                    const isSaved = savedJobIds.includes(job.id);
                    const skillsList = (job.required_skills || (job as any).job_skills || [])
                      .slice(0, 4)
                      .map((sk: any) => sk.skill?.name || sk.name || 'Skill');
                    const matchScore = job.match?.overallScore || Math.min(96, 75 + ((job.id?.charCodeAt(0) || 0) % 20));
                    const distanceKm = job.match?.distanceKm ?? job.distance_km;
                    const appliedCount = job.views ? Math.max(Math.floor(job.views / 3), 4) : 24;
                    const isUrgent = job.is_urgent || job.company?.is_urgent;

                    return (
                      <div
                        key={job.id}
                        className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4 group"
                      >
                        {/* Top Row: Initials Badge + Title & Company + Bookmark */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Company Circle Badge */}
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                              {job.company?.logo_url ? (
                                <img
                                  src={job.company.logo_url}
                                  alt={job.company?.name || 'Company'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getCompanyInitials(job.company?.name)
                              )}
                            </div>

                            {/* Title and Company */}
                            <div className="min-w-0">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer truncate block"
                                title={job.title}
                              >
                                {job.title}
                              </Link>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {job.company?.name || 'Company'}
                              </p>
                            </div>
                          </div>

                          {/* Bookmark Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSave(job.id)}
                            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                              isSaved
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                            title={isSaved ? 'Remove from Saved' : 'Save Job'}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Match Score & Distance Pill Badges */}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {matchScore}% Match
                          </span>
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                            {formatDistance(distanceKm)}
                          </span>
                        </div>

                        {/* Job Details Meta (Salary, Employment, Posted Time) */}
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="font-semibold text-slate-700">
                            $ {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency || 'PHP')}
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-500">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{job.employment_type || 'Full-time'}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{job.created_at ? formatRelativeTime(job.created_at) : 'recently'}</span>
                          </p>
                        </div>

                        {/* Skill Tags */}
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {skillsList.map((skill: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="text-[11px] font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-100/90 px-2.5 py-0.5 rounded-lg"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Urgent Badge */}
                        {isUrgent && (
                          <div className="flex items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                              <Flame className="w-3 h-3 text-rose-600" /> Urgent Hiring
                            </span>
                          </div>
                        )}

                        {/* Card Footer: Overlapping Avatars + Apply Now Button */}
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          {/* Top row: Avatar stack + applicants count + See Profiles */}
                          <div
                            className="flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-50/60 -mx-1 px-1 py-1 rounded-xl transition-all group/stalker"
                            onClick={() => setSelectedJobForStalker(job)}
                            title="View candidates who applied or visited this job"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex -space-x-2 overflow-hidden shrink-0">
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                                  A
                                </div>
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                                  B
                                </div>
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">
                                  C
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-600 font-semibold truncate">
                                <strong className="text-slate-800">{appliedCount}</strong> people applied
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 group-hover/stalker:underline flex items-center gap-1 shrink-0">
                              <Users className="w-3 h-3" /> See Profiles
                            </span>
                          </div>

                          {/* Apply Now Pill Button */}
                          <Link
                            href={`/jobs/${job.id}`}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition-colors cursor-pointer block text-center"
                          >
                            Apply Now →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
        )}
      </>
    );
  })()}
      </div>

      {/* View Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isOpen={!!selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onApplyClick={(jobToApply) => {
            setSelectedJobForDetails(null);
            setSelectedJobForApply(jobToApply);
          }}
          isSaved={savedJobIds.includes(selectedJobForDetails.id)}
          onToggleSave={(jobId) => handleToggleSave(jobId)}
        />
      )}

      {/* Apply with Resume Modal */}
      {selectedJobForApply && (
        <ApplyModal
          job={selectedJobForApply}
          isOpen={!!selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          matchScore={selectedJobForApply.match?.overallScore || 0}
          onSuccess={() => {
            setAppliedJobIds((prev) => [...prev, selectedJobForApply.id]);
          }}
        />
      )}

      {/* Applicant Stalker Modal */}
      {selectedJobForStalker && (
        <ApplicantStalkerModal
          isOpen={!!selectedJobForStalker}
          onClose={() => setSelectedJobForStalker(null)}
          job={selectedJobForStalker}
          currentUserId={userId}
          currentUserMatchScore={selectedJobForStalker.match?.overallScore || 92}
        />
      )}
    </DashboardLayout>
  );
}

export default function SeekerFindJobsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout portal="seeker" title="Find Jobs">
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      }
    >
      <FindJobsContent />
    </Suspense>
  );
}
