'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { MatchScoreGauge } from '@/components/matching/MatchScoreGauge';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatRelativeTime } from '@/lib/utils';
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
  Filter,
} from 'lucide-react';

export default function SeekerFindJobsPage() {
  const [userId, setUserId] = useState('');
  const [candidateData, setCandidateData] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // Fetch candidate data for match percentage computation
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
        fetchJobs(undefined, cData),
        fetchSavedJobs(user.id),
        fetchApplied(user.id),
      ]);
    });
  }, []);

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
    if (filters?.keyword) {
      query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);
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

  const handleSearch = () => {
    fetchJobs({ keyword, city, work_arrangement: workArrangement });
  };

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

  return (
    <DashboardLayout
      portal="seeker"
      title="Find Jobs"
      subtitle="Discover open opportunities with real-time AI skill and location match percentages."
      actions={
        <Link href="/seeker/scanner">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Sparkles className="w-4 h-4" /> AI Recommendations Hub
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Controls */}
        <div className="bg-white rounded-3xl border border-border p-4 sm:p-5 shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <Input
              placeholder="Job title, keywords, or skills..."
              icon={<Search className="w-4 h-4" />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
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

          <div className="lg:col-span-2">
            <Button variant="primary" size="md" onClick={handleSearch} className="w-full font-bold justify-center">
              <Search className="w-4 h-4" /> Search
            </Button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span>
            Found <strong className="text-dark font-bold">{jobs.length}</strong> available positions
          </span>
          <span className="flex items-center gap-1 text-mint-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Match percentages tailored to your profile
          </span>
        </div>

        {/* Job Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No job openings found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Try adjusting your search keywords or clearing location filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setKeyword('');
                setCity('');
                setWorkArrangement('');
                fetchJobs({ keyword: '', city: '', work_arrangement: '' });
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => {
              const isSaved = savedJobIds.includes(job.id);
              const isApplied = appliedJobIds.includes(job.id);
              const skillsList = job.required_skills || (job as any).job_skills || [];

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-border p-5 sm:p-6 shadow-soft hover:border-mint-300 transition-all space-y-4 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                        {job.company?.logo_url ? (
                          <img
                            src={job.company.logo_url}
                            alt={job.company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                            {job.employment_type} • {job.work_arrangement}
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city || 'Remote'}
                          </span>
                        </div>

                        <h3
                          onClick={() => setSelectedJobForDetails(job)}
                          className="text-lg font-bold text-dark group-hover:text-mint-600 transition-colors cursor-pointer line-clamp-1"
                        >
                          {job.title}
                        </h3>

                        <Link
                          href={`/companies/${job.company_id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-mint-600 transition-colors inline-flex items-center gap-1"
                        >
                          {job.company?.name || 'Company'}
                          {job.company?.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                          )}
                        </Link>

                        <p className="text-xs font-black text-mint-800 pt-0.5">
                          {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {/* Match Score Display */}
                      {job.match && (
                        <div className="flex flex-col items-end mr-1">
                          <span className="text-[11px] font-black text-mint-800 bg-mint-50 px-2.5 py-1 rounded-full border border-mint-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-mint-600" /> {job.match.overallScore}% Match
                          </span>
                          <span className="text-[10px] text-muted capitalize mt-0.5">
                            {job.match.tier} Fit
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => handleToggleSave(job.id)}
                        className={`p-2.5 rounded-xl border transition-colors ${
                          isSaved
                            ? 'bg-mint-50 border-mint-200 text-mint-600'
                            : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save Job'}
                        aria-label={isSaved ? 'Remove from Saved' : 'Save Job'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-4 h-4 text-mint-600" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>

                      {/* View Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJobForDetails(job)}
                        className="text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Button>

                      {/* Apply Now Button */}
                      <Button
                        variant={isApplied ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => {
                          if (!isApplied) {
                            setSelectedJobForApply(job);
                          }
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

                  {job.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  {/* Skills badges snippet */}
                  {skillsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Skills:</span>
                      {skillsList.slice(0, 4).map((sk: any, i: number) => (
                        <span
                          key={sk.id || i}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700"
                        >
                          {sk.name || sk.skill?.name || 'Skill'}
                        </span>
                      ))}
                      {skillsList.length > 4 && (
                        <span className="text-[10px] text-muted">+{skillsList.length - 4} more</span>
                      )}
                    </div>
                  )}
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
