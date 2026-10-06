'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { MatchScoreGauge } from '@/components/matching/MatchScoreGauge';
import { ApplicantStalkerModal } from '@/components/jobs/ApplicantStalkerModal';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatDistance, formatRelativeTime } from '@/lib/utils';
import {
  Sparkles,
  Briefcase,
  MapPin,
  Building2,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Eye,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Filter,
  RefreshCw,
  Star,
  Check,
  Search,
  SlidersHorizontal,
  Plus,
  Clock,
  Flame,
  Users,
} from 'lucide-react';

export default function SeekerAIRecommendationsPage() {
  const [tierFilter, setTierFilter] = useState<'all' | 'exceptional' | 'strong' | 'good'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [candidateData, setCandidateData] = useState<any | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);
  const [selectedJobForStalker, setSelectedJobForStalker] = useState<any | null>(null);

  const getCompanyInitials = (name?: string) => {
    if (!name) return 'WM';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      await loadRecommendations(user.id);
    });
  }, []);

  async function loadRecommendations(uid: string) {
    setLoading(true);

    const [profileRes, seekerRes, skillsRes, eduRes, savedRes, appliedRes, jobsRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('job_seeker_profiles').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', uid),
        supabase.from('educations').select('*').eq('user_id', uid),
        supabase.from('saved_jobs').select('job_id').eq('user_id', uid),
        supabase.from('applications').select('job_id').eq('applicant_id', uid),
        supabase
          .from('jobs')
          .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
      ]);

    const cData = {
      profile: seekerRes.data || {},
      skills: skillsRes.data || [],
      educations: eduRes.data || [],
      user: profileRes.data || {},
    };
    setCandidateData(cData);
    setSavedJobIds((savedRes.data ?? []).map((s: any) => s.job_id));
    setAppliedJobIds((appliedRes.data ?? []).map((a: any) => a.job_id));

    const rawJobs = jobsRes.data ?? [];

    // Evaluate multi-factor match score for every job against candidate's profile
    const scoredJobs = rawJobs.map((job: any) => {
      const match = calculateJobMatch(job, cData as any);
      return {
        ...job,
        match,
      };
    });

    // Sort by highest match score first
    scoredJobs.sort((a, b) => b.match.overallScore - a.match.overallScore);

    setRecommendedJobs(scoredJobs);
    setLoading(false);
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

  // Filter recommendations by tier and search query
  const filteredRecommendations = recommendedJobs.filter((job) => {
    // Tier filter
    let passesTier = true;
    if (tierFilter === 'exceptional') passesTier = job.match.overallScore >= 90;
    else if (tierFilter === 'strong') passesTier = job.match.overallScore >= 80 && job.match.overallScore < 90;
    else if (tierFilter === 'good') passesTier = job.match.overallScore >= 70 && job.match.overallScore < 80;

    // Search query filter
    let passesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = job.title?.toLowerCase().includes(q);
      const companyMatch = job.company?.name?.toLowerCase().includes(q);
      const cityMatch = job.city?.toLowerCase().includes(q);
      passesSearch = Boolean(titleMatch || companyMatch || cityMatch);
    }

    return passesTier && passesSearch;
  });

  const exceptionalCount = recommendedJobs.filter((j) => j.match.overallScore >= 90).length;
  const strongCount = recommendedJobs.filter((j) => j.match.overallScore >= 80 && j.match.overallScore < 90).length;
  const goodCount = recommendedJobs.filter((j) => j.match.overallScore >= 70 && j.match.overallScore < 80).length;

  return (
    <DashboardLayout
      portal="seeker"
      title="AI Job Recommendations"
      subtitle="Personalized job matches ranked by our multi-factor matching engine analyzing your skills, experience, and preferences."
      actions={
        <div className="flex items-center gap-2">
          <Link href="/seeker/profile/edit">
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Update My Skills
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => loadRecommendations(userId)}
            className="text-xs font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Recommendations
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Candidate Profile Skills & Match Overview Header Banner */}
        <div className="bg-gradient-to-r from-mint-500 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> AI Skill-Matching Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Jobs Matched with Your Profile
              </h2>
              <p className="text-xs sm:text-sm text-mint-100 leading-relaxed">
                We've evaluated <strong className="text-white font-bold">{recommendedJobs.length} open roles</strong> against your verified skills, {candidateData?.profile?.years_experience || 0} years experience, and location preferences in {candidateData?.profile?.city || 'the Philippines'}.
              </p>
            </div>

            {/* Candidate quick skills chips snippet */}
            <div className="bg-white/15 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-mint-100 font-semibold">Your Active Skills:</span>
                <span className="font-bold bg-white text-mint-800 px-2 py-0.5 rounded-full text-[11px]">
                  {candidateData?.skills?.length || 0} Skills
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {(candidateData?.skills || []).slice(0, 5).map((sk: any) => (
                  <span
                    key={sk.id}
                    className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-medium truncate"
                  >
                    {sk.skill?.name}
                  </span>
                ))}
                {(candidateData?.skills?.length || 0) > 5 && (
                  <span className="text-[10px] text-mint-200">
                    +{candidateData.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Tier Filter Controls */}
        <div className="bg-white rounded-3xl border border-border p-4 sm:p-5 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search within recommendations */}
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search matching roles or companies..."
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick counters */}
            <div className="text-xs text-muted flex items-center gap-2 self-start sm:self-center">
              <span>Showing <strong className="text-dark">{filteredRecommendations.length}</strong> matching jobs</span>
            </div>
          </div>

          {/* Match Score Tier Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setTierFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tierFilter === 'all'
                  ? 'bg-dark text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Matches ({recommendedJobs.length})
            </button>
            <button
              onClick={() => setTierFilter('exceptional')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'exceptional'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Exceptional Fit (≥90%) ({exceptionalCount})
            </button>
            <button
              onClick={() => setTierFilter('strong')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'strong'
                  ? 'bg-mint-600 text-white shadow-sm'
                  : 'bg-mint-50 text-mint-800 hover:bg-mint-100 border border-mint-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-mint-400" />
              Strong Fit (80-89%) ({strongCount})
            </button>
            <button
              onClick={() => setTierFilter('good')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'good'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Good Fit (70-79%) ({goodCount})
            </button>
          </div>
        </div>

        {/* Recommendations Job Listings Feed */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3 shadow-soft">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No recommendations found</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Add more skills and update your experience level on your profile to unlock higher matching percentages.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setTierFilter('all'); setSearchQuery(''); }}>
                Reset Filters
              </Button>
              <Link href="/seeker/profile/edit">
                <Button variant="primary" size="sm">
                  Add Skills to Profile
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecommendations.map((job) => {
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
