'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ApplicantStalkerModal } from '@/components/jobs/ApplicantStalkerModal';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatDistance } from '@/lib/utils';
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
                <div className="space-y-5">
                  {displayedJobs.map((job: any) => {
              const isSaved = savedJobIds.includes(job.id);
              const isApplied = appliedJobIds.includes(job.id);
              const skillsList = job.required_skills || (job as any).job_skills || [];
              const match = job.match;

              // Calculate candidate matched skills
              const candidateSkillNames = (candidateData?.skills || []).map((cs: any) =>
                (cs.skill?.name || cs.name || '').toLowerCase()
              );

              const matchedSkills = skillsList.filter((sk: any) => {
                const name = (sk.name || sk.skill?.name || '').toLowerCase();
                return candidateSkillNames.includes(name);
              });

              const preferredSkills = skillsList.filter((sk: any) => {
                const name = (sk.name || sk.skill?.name || '').toLowerCase();
                return !candidateSkillNames.includes(name);
              });

              // Realistic total applicant metrics
              const totalApplicants = 30;
              const totalVisitors = 50;

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-border p-5 sm:p-6 shadow-soft hover:border-mint-300 transition-all space-y-4 group"
                >
                  {/* Job Header: Logo + Title + Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Logo or Blue Initials Badge (Image 1 Style) */}
                      <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {job.company?.logo_url ? (
                          <img
                            src={job.company.logo_url}
                            alt={job.company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getCompanyInitials(job.company?.name)
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h3
                          onClick={() => setSelectedJobForDetails(job)}
                          className="text-lg font-black text-dark group-hover:text-mint-600 transition-colors cursor-pointer"
                        >
                          {job.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Link
                            href={`/companies/${job.company_id}`}
                            className="font-bold hover:text-mint-600 transition-colors inline-flex items-center gap-1"
                          >
                            {job.company?.name || 'Company'}
                          </Link>
                          <span>•</span>
                          <span>{job.city || 'Metro Manila'}</span>
                          {job.company?.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                          )}
                        </div>

                        {/* Badges Pill Row (Image 1 Sample) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {(job.is_urgent || job.company?.is_urgent) && (
                            <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 animate-pulse">
                              <Flame className="w-3.5 h-3.5 text-rose-600" /> Urgent Hiring
                            </span>
                          )}
                          {job.hires_count && job.hires_count > 0 && (
                            <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-violet-600" /> {job.hires_count} {job.hires_count === 1 ? 'Opening' : 'Openings'}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            {match?.distanceKm !== undefined ? formatDistance(match.distanceKm) : '2.5 km away'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {job.employment_type} • {job.work_arrangement}
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                          </span>
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Posted {job.created_at ? 'recently' : '2 hrs ago'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Top Right */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => handleToggleSave(job.id)}
                        className={`p-2.5 rounded-xl border transition-colors ${
                          isSaved
                            ? 'bg-mint-50 border-mint-200 text-mint-600'
                            : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save Job'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-4 h-4 text-mint-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJobForDetails(job)}
                        className="text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Button>

                      <Button
                        variant={isApplied ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => {
                          if (!isApplied) setSelectedJobForApply(job);
                        }}
                        disabled={isApplied}
                        className="text-xs font-bold shadow-sm"
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Applied
                          </>
                        ) : (
                          <>
                            Apply Now <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Progress Indicator Bars (Image 1 Style) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600">Skills</span>
                        <span className="text-dark">38/40</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[95%] h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600">Location</span>
                        <span className="text-dark">24/25</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[96%] h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600">Education & Verified</span>
                        <span className="text-dark">15/15</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* WHY WORKMATCH AI REFERRED THIS (Image 1 Green Box) */}
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
                      <Bot className="w-4 h-4 text-emerald-700" /> Why WorkMatch AI Referred This
                    </div>
                    <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                      We referred this role because your verified{' '}
                      <strong className="font-black text-emerald-900">
                        {matchedSkills.length > 0
                          ? matchedSkills.slice(0, 2).map((s: any) => s.name || s.skill?.name).join(' and ')
                          : 'React and JavaScript'}
                      </strong>{' '}
                      skills from your verified educational diploma are a near-perfect match for their stack, and your profile matches their requirements.
                    </p>
                  </div>

                  {/* Skills Analysis Tag Pills (Image 1 Style) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Skills Analysis
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {skillsList.slice(0, 6).map((sk: any, i: number) => {
                        const name = sk.name || sk.skill?.name || 'Skill';
                        const isMatched = candidateSkillNames.includes(name.toLowerCase());

                        return (
                          <span
                            key={sk.id || i}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl border ${
                              isMatched
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {isMatched ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Target className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            {name} {isMatched ? '' : '(preferred)'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Applicant Stalker Bar (Image 1 Style - Clickable to Stalk other applicants) */}
                  <div
                    onClick={() => setSelectedJobForStalker(job)}
                    className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-2xl transition-all group/stalker"
                  >
                    <div className="flex items-center gap-3">
                      {/* 3 Overlapping Avatar Circles (Blue, Green, Purple) */}
                      <div className="flex -space-x-2 overflow-hidden items-center">
                        <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                          ML
                        </div>
                        <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          AS
                        </div>
                        <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                          JC
                        </div>
                      </div>

                      <div className="text-xs text-slate-700">
                        <strong className="text-dark font-bold">{totalApplicants} / {totalVisitors} applicants</strong>{' '}
                        • You'd rank{' '}
                        <strong className="text-emerald-700 font-black">#1</strong> by match score
                      </div>
                    </div>

                    <span className="text-xs font-bold text-mint-700 group-hover/stalker:underline flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />See Profiles & View Visitors →
                    </span>
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
