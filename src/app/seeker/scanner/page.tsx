'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { MatchScoreGauge } from '@/components/matching/MatchScoreGauge';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatDistance } from '@/lib/utils';
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
          <div className="space-y-4">
            {filteredRecommendations.map((job) => {
              const isSaved = savedJobIds.includes(job.id);
              const isApplied = appliedJobIds.includes(job.id);
              const match = job.match;
              const skillsList = job.required_skills || (job as any).job_skills || [];

              // Determine color themes based on match score
              const score = match.overallScore;
              let badgeColor = 'bg-mint-50 border-mint-200 text-mint-900';
              if (score >= 90) {
                badgeColor = 'bg-emerald-50 border-emerald-300 text-emerald-900';
              } else if (score < 75) {
                badgeColor = 'bg-amber-50 border-amber-200 text-amber-900';
              }

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-border p-6 shadow-soft hover:border-mint-300 transition-all space-y-4 group relative"
                >
                  {/* Top Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        {job.company?.logo_url ? (
                          <img
                            src={job.company.logo_url}
                            alt={job.company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-7 h-7 text-slate-400" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                            {job.employment_type} • {job.work_arrangement}
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city || 'Remote'}
                            {match.distanceKm !== undefined && (
                              <span className="text-mint-700 font-semibold ml-1">
                                ({formatDistance(match.distanceKm)})
                              </span>
                            )}
                          </span>
                        </div>

                        <h3
                          onClick={() => setSelectedJobForDetails(job)}
                          className="text-lg font-black text-dark group-hover:text-mint-600 transition-colors cursor-pointer"
                        >
                          {job.title}
                        </h3>

                        <Link
                          href={`/companies/${job.company_id}`}
                          className="text-xs font-bold text-slate-600 hover:text-mint-600 transition-colors inline-flex items-center gap-1"
                        >
                          {job.company?.name || 'Company'}
                          {job.company?.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-mint-500" />
                          )}
                        </Link>

                        <p className="text-xs font-black text-mint-800 pt-0.5">
                          {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                        </p>
                      </div>
                    </div>

                    {/* Match Score Display */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border ${badgeColor}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          {match.overallScore}% Match
                        </span>
                        <p className="text-[10px] text-muted font-bold capitalize mt-0.5">
                          {match.tier} Candidate Fit
                        </p>
                      </div>

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
                    </div>
                  </div>

                  {/* Why You Match Breakdown Grid */}
                  <div className="p-4 rounded-2xl bg-mint-50/50 border border-mint-100 space-y-2.5">
                    <span className="text-xs font-bold text-mint-950 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-mint-600" /> Why You Match This Role:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {match.factors?.skills && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-mint-100/70">
                          <span className="font-bold text-dark block">Skills Match (40%)</span>
                          <span className="text-[11px] text-slate-600">{match.factors.skills.explanation}</span>
                        </div>
                      )}
                      {match.factors?.experience && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-mint-100/70">
                          <span className="font-bold text-dark block">Experience Fit (20%)</span>
                          <span className="text-[11px] text-slate-600">{match.factors.experience.explanation}</span>
                        </div>
                      )}
                      {match.factors?.location && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-mint-100/70">
                          <span className="font-bold text-dark block">Location & Setup (20%)</span>
                          <span className="text-[11px] text-slate-600">{match.factors.location.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Required Skills Badges with Matched/Missing Indicator */}
                  {skillsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Skills:</span>
                      {skillsList.map((sk: any, i: number) => {
                        const name = sk.name || sk.skill?.name || 'Skill';
                        const candidateHasSkill = candidateData?.skills?.some(
                          (cs: any) => (cs.skill?.name || cs.name || '').toLowerCase() === name.toLowerCase()
                        );

                        return (
                          <span
                            key={sk.id || i}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                              candidateHasSkill
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {candidateHasSkill && <Check className="w-3 h-3 text-emerald-600" />}
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-muted">
                      Matched by WorkMatch Intelligent Recruiter Engine
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJobForDetails(job)}
                        className="w-full sm:w-auto text-xs font-semibold"
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
                        className="w-full sm:w-auto text-xs font-bold shadow-sm"
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Applied
                          </>
                        ) : (
                          <>
                            Apply with Resume <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
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
    </DashboardLayout>
  );
}
