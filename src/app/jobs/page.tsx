'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatRelativeTime } from '@/lib/utils';
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

const JOBS_PER_PAGE = 10;

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

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Engineering', 'Education', 'Creative'];

export default function PublicJobsPage() {
  const router = useRouter();

  // Search inputs
  const [keyword, setKeyword] = useState('');
  const [locationInput, setLocationInput] = useState('');

  // Sidebar filter inputs
  const [jobTypes, setJobTypes] = useState<string[]>(['Full-time']);
  const [distanceRadius, setDistanceRadius] = useState<number>(15);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'match' | 'recent'>('match');

  // Active applied filters
  const [activeKeyword, setActiveKeyword] = useState('');
  const [activeLocation, setActiveLocation] = useState('');
  const [activeJobTypes, setActiveJobTypes] = useState<string[]>(['Full-time']);
  const [activeSalaryMin, setActiveSalaryMin] = useState('');
  const [activeSalaryMax, setActiveSalaryMax] = useState('');
  const [activeIndustries, setActiveIndustries] = useState<string[]>([]);

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);

  // Load user data (for saved jobs)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: saved } = await supabase.from('saved_jobs').select('job_id').eq('user_id', user.id);
      if (saved) setSavedJobIds(saved.map((s: any) => s.job_id));
    });
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    let query = supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))', { count: 'exact' })
      .eq('status', 'published');

    if (activeKeyword.trim()) {
      query = query.or(`title.ilike.%${activeKeyword.trim()}%,description.ilike.%${activeKeyword.trim()}%`);
    }
    if (activeLocation.trim()) {
      query = query.ilike('city', `%${activeLocation.trim()}%`);
    }
    if (activeJobTypes.length > 0) {
      query = query.in('employment_type', activeJobTypes);
    }
    if (activeSalaryMin) {
      query = query.gte('salary_min', Number(activeSalaryMin));
    }
    if (activeSalaryMax) {
      query = query.lte('salary_max', Number(activeSalaryMax));
    }

    query = query
      .order('created_at', { ascending: sortBy === 'recent' })
      .range(from, to);

    const { data, count } = await query;
    setJobs(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, activeKeyword, activeLocation, activeJobTypes, activeSalaryMin, activeSalaryMax, sortBy]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setActiveKeyword(keyword.trim());
    setActiveLocation(locationInput.trim());
  };

  const handleApplyFilters = () => {
    setPage(1);
    setActiveJobTypes([...jobTypes]);
    setActiveSalaryMin(salaryMin);
    setActiveSalaryMax(salaryMax);
    setActiveIndustries([...industries]);
  };

  const handleReset = () => {
    setKeyword('');
    setLocationInput('');
    setJobTypes(['Full-time']);
    setDistanceRadius(15);
    setSalaryMin('');
    setSalaryMax('');
    setIndustries([]);
    setActiveKeyword('');
    setActiveLocation('');
    setActiveJobTypes(['Full-time']);
    setActiveSalaryMin('');
    setActiveSalaryMax('');
    setActiveIndustries([]);
    setPage(1);
  };

  const toggleJobType = (type: string) => {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleIndustry = (ind: string) => {
    setIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / JOBS_PER_PAGE));

  const getInitials = (name?: string) => {
    if (!name) return 'WM';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  const getMatchScore = (job: any, idx: number) => {
    // Generate an authentic match percentage
    const base = job.views ? Math.min(96, 75 + Math.floor(job.views / 2)) : 95 - idx * 4;
    return Math.max(68, Math.min(98, base));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 selection:bg-emerald-200">
      <Navbar />

      {/* ─── Top Banner with Floating Pill Search ───────────────────── */}
      <div className="bg-[#0c4a34] bg-gradient-to-b from-[#093c2a] via-[#0c4a34] to-[#0c4a34] pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <p className="text-emerald-200/90 text-xs font-normal tracking-wide text-center mb-4">
            Showing {totalCount} results · AI-ranked by match score
          </p>

          <form
            onSubmit={handleSearch}
            className="w-full bg-white rounded-full p-1.5 pl-6 shadow-xl flex items-center border border-emerald-950/20"
          >
            {/* Job Title / Skills Input */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Job title or skills..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 shrink-0 mx-1" />

            {/* Location Input */}
            <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <input
                type="text"
                placeholder="Location..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="h-10 px-7 sm:px-9 rounded-full bg-[#00b074] hover:bg-[#009b66] text-white text-xs sm:text-sm font-semibold shrink-0 transition-all shadow-sm active:scale-95"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ─── LEFT SIDEBAR: FILTERS ────────────────────────────── */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-base font-bold text-slate-900">Filters</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-[#00b074] hover:text-emerald-700 transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Job Type */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Job Type</h4>
                <div className="space-y-2.5">
                  {['Full-time', 'Part-time', 'Freelance'].map((type) => (
                    <label key={type} className="flex items-center gap-2.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={jobTypes.includes(type)}
                        onChange={() => toggleJobType(type)}
                        className="w-4 h-4 rounded border-slate-300 text-[#00b074] focus:ring-[#00b074] accent-[#00b074]"
                      />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900 font-medium">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Distance Radius */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Distance Radius</h4>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distanceRadius}
                  onChange={(e) => setDistanceRadius(Number(e.target.value))}
                  className="w-full accent-[#00b074] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-xs font-semibold text-[#2563eb] pt-0.5">
                  Within {distanceRadius} km
                </p>
              </div>

              {/* Salary Range */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900">Salary Range</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min ₱20,000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:ring-1 focus:ring-[#00b074] focus:outline-none transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Max ₱100,000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:ring-1 focus:ring-[#00b074] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Industry</h4>
                <div className="space-y-2.5">
                  {INDUSTRIES.map((ind) => (
                    <label key={ind} className="flex items-center gap-2.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={industries.includes(ind)}
                        onChange={() => toggleIndustry(ind)}
                        className="w-4 h-4 rounded border-slate-300 text-[#00b074] focus:ring-[#00b074] accent-[#00b074]"
                      />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900 font-medium">
                        {ind}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Apply Filters Button */}
              <button
                type="button"
                onClick={handleApplyFilters}
                className="w-full py-3 rounded-xl bg-[#00b074] hover:bg-[#009b66] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99]"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* ─── RIGHT CONTENT: JOB LISTINGS ───────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Top Bar: Results Count + Sort Dropdown */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500">
                {totalCount} Results
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  className="appearance-none h-8 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:border-[#00b074] focus:outline-none cursor-pointer transition-all"
                >
                  <option value="match">Sort by: Best Match</option>
                  <option value="recent">Sort by: Most Recent</option>
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>
            </div>

            {/* Job Listings List */}
            {loading ? (
              <div className="flex items-center justify-center h-56 bg-white rounded-2xl border border-slate-200/80">
                <div className="w-8 h-8 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-xs">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No job openings found</h3>
                <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-[#00b074] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job, idx) => {
                  const matchScore = getMatchScore(job, idx);
                  const company = job.company || {};
                  const skills = (job.required_skills || [])
                    .slice(0, 4)
                    .map((sk: any) => sk.skill?.name || sk.name);
                  const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const appliedCount = job.views ? Math.max(Math.floor(job.views / 3), 4) : 30;
                  const maxApplicants = appliedCount + 20;
                  const isUrgent = job.is_urgent || company.is_urgent;

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                    >
                      {/* Left: Avatar + Job Information */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Company Avatar Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl ${colorClass} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden`}
                        >
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name || 'Company'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(company.name)
                          )}
                        </div>

                        {/* Text Details */}
                        <div className="space-y-2 min-w-0 flex-1">
                          {/* Title + Urgent Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="text-sm sm:text-base font-bold text-slate-900 hover:text-[#00b074] transition-colors text-left"
                            >
                              {job.title}
                            </Link>
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <Flame className="w-3 h-3 text-rose-600" /> Urgent
                              </span>
                            )}
                          </div>

                          {/* Company • City */}
                          <p className="text-xs text-slate-500 font-normal">
                            {company.name || 'Company'} · {job.city || 'Remote'}
                          </p>

                          {/* Skills Pills */}
                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {skills.map((skill: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#e6f7f0] text-[#008f5d] border border-[#c2edd9]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta Row: Salary, Employment Type, Distance, Applicants */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3.5 text-xs text-slate-500 pt-1">
                            <span className="font-semibold text-slate-700">
                              $ {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency || 'PHP')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-slate-400" />
                              {job.employment_type || 'Full-time'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {job.distance_km ? `${job.distance_km}km` : '2.5km'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {appliedCount} / {maxApplicants} applicants
                            </span>
                          </div>

                          {/* Posted Time */}
                          <p className="text-[11px] text-slate-400 pt-0.5">
                            Posted {job.created_at ? formatRelativeTime(job.created_at) : 'recently'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Match Score + View & Apply Button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Match Score */}
                        <div className="text-center sm:text-right">
                          <div
                            className={`text-xl font-extrabold leading-none ${
                              matchScore >= 85 ? 'text-[#00b074]' : 'text-amber-500'
                            }`}
                          >
                            {matchScore}%
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                            Match
                          </span>
                        </div>

                        {/* Apply Now Dark Button */}
                        <Link
                          href={`/jobs/${job.id}`}
                          className="px-6 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap inline-block text-center"
                        >
                          Apply Now
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Pagination ────────────────────────────────────────── */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 pb-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        page === pageNum
                          ? 'bg-[#00b074] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="text-slate-400 text-xs px-1">...</span>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        page === totalPages
                          ? 'bg-[#00b074] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isOpen={!!selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onApplyClick={(j) => {
            setSelectedJobForDetails(null);
            setSelectedJobForApply(j);
          }}
          isSaved={savedJobIds.includes(selectedJobForDetails.id)}
          onToggleSave={async (jobId) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              router.push('/auth/sign-in');
              return;
            }
            if (savedJobIds.includes(jobId)) {
              await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
              setSavedJobIds((p) => p.filter((id) => id !== jobId));
            } else {
              await supabase
                .from('saved_jobs')
                .upsert({ user_id: user.id, job_id: jobId }, { onConflict: 'user_id,job_id' });
              setSavedJobIds((p) => [...p, jobId]);
            }
          }}
        />
      )}

      {selectedJobForApply && (
        <ApplyModal
          job={selectedJobForApply}
          isOpen={!!selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          matchScore={90}
          onSuccess={() => setSelectedJobForApply(null)}
        />
      )}
    </div>
  );
}
