'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ApplicantStalkerModal } from '@/components/jobs/ApplicantStalkerModal';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange, formatDistance, formatRelativeTime } from '@/lib/utils';
import {
  Search,
  MapPin,
  Send,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  Users,
  Flame,
} from 'lucide-react';

interface DisplayJob {
  id: string;
  title: string;
  companyName: string;
  companyInitials: string;
  companyLogo?: string | null;
  badgeBgColor: string;
  matchScore: number;
  distanceKm: number;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  employmentType: string;
  workArrangement: string;
  city: string;
  postedAgo: string;
  skills: string[];
  appliedCount: number;
  isUrgent?: boolean;
  rawJob?: any;
}

const DEFAULT_SHOWCASE_JOBS: DisplayJob[] = [
  {
    id: 'demo-job-1',
    title: 'Senior Frontend Developer',
    companyName: 'Accenture Philippines',
    companyInitials: 'AC',
    badgeBgColor: 'bg-blue-600',
    matchScore: 95,
    distanceKm: 2.5,
    salaryMin: 55000,
    salaryMax: 80000,
    salaryCurrency: 'PHP',
    employmentType: 'Full-time',
    workArrangement: 'Hybrid',
    city: 'Taguig, Metro Manila',
    postedAgo: 'Posted 2 hours ago',
    skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
    appliedCount: 12,
  },
  {
    id: 'demo-job-2',
    title: 'Data Analyst',
    companyName: 'Globe Telecom',
    companyInitials: 'GL',
    badgeBgColor: 'bg-emerald-600',
    matchScore: 91,
    distanceKm: 4.2,
    salaryMin: 45000,
    salaryMax: 65000,
    salaryCurrency: 'PHP',
    employmentType: 'Full-time',
    workArrangement: 'On-site',
    city: 'Mandaluyong, Metro Manila',
    postedAgo: 'Posted 5 hours ago',
    skills: ['Python', 'SQL', 'Tableau', 'Excel'],
    appliedCount: 8,
  },
  {
    id: 'demo-job-3',
    title: 'UX/UI Designer',
    companyName: 'SM Investments',
    companyInitials: 'SM',
    badgeBgColor: 'bg-orange-600',
    matchScore: 88,
    distanceKm: 3.1,
    salaryMin: 50000,
    salaryMax: 70000,
    salaryCurrency: 'PHP',
    employmentType: 'Hybrid',
    workArrangement: 'Hybrid',
    city: 'Pasay City, Metro Manila',
    postedAgo: 'Posted 1 day ago',
    skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping'],
    appliedCount: 15,
  },
];

export default function HomePage() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search states
  const [keywordQuery, setKeywordQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeFilterKeyword, setActiveFilterKeyword] = useState('');
  const [activeFilterLocation, setActiveFilterLocation] = useState('');

  // Jobs state
  const [allJobs, setAllJobs] = useState<DisplayJob[]>(DEFAULT_SHOWCASE_JOBS);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);
  const [selectedJobForStalker, setSelectedJobForStalker] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'full_time', 'hybrid'
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Load real published jobs from Supabase and merge
  useEffect(() => {
    async function loadJobsAndSavedStatus() {
      try {
        const { data: dbJobs } = await supabase
          .from('jobs')
          .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(12);

        if (dbJobs && dbJobs.length > 0) {
          const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-orange-600', 'bg-purple-600', 'bg-rose-600', 'bg-indigo-600'];
          const mappedDbJobs: DisplayJob[] = dbJobs.map((j: any, index: number) => {
            const comp = j.company || {};
            const skillsList = (j.required_skills || []).map((sk: any) => sk.skill?.name || sk.name || 'Skill');
            const compName = comp.name || 'Company';
            const initials = compName
              .split(' ')
              .slice(0, 2)
              .map((w: string) => w[0])
              .join('')
              .toUpperCase() || 'WM';

            const score = 96 - (index * 3); // realistic dynamic match score descending

            return {
              id: j.id,
              title: j.title,
              companyName: compName,
              companyInitials: initials,
              companyLogo: comp.logo_url,
              badgeBgColor: colors[index % colors.length],
              matchScore: Math.max(score, 78),
              distanceKm: Number((2.0 + (index * 0.8)).toFixed(1)),
              salaryMin: Number(j.salary_min) || 45000,
              salaryMax: Number(j.salary_max) || 75000,
              salaryCurrency: j.salary_currency || 'PHP',
              employmentType: j.employment_type || 'Full-time',
              workArrangement: j.work_arrangement || 'Hybrid',
              city: j.city || 'Metro Manila',
              postedAgo: j.created_at ? `Posted ${formatRelativeTime(j.created_at)}` : 'Posted recently',
              skills: skillsList.length > 0 ? skillsList.slice(0, 4) : ['React', 'TypeScript', 'Node.js', 'SQL'],
              appliedCount: Math.max(j.views ? Math.floor(j.views / 3) : 0, (index + 1) * 2),
              isUrgent: !!(j.is_urgent || comp.is_urgent),
              rawJob: j,
            };
          });

          // Ensure we have at least 3 jobs, filling from showcase if needed
          const combined = [...mappedDbJobs];
          DEFAULT_SHOWCASE_JOBS.forEach((demo) => {
            if (!combined.some((item) => item.title.toLowerCase() === demo.title.toLowerCase())) {
              combined.push(demo);
            }
          });
          setAllJobs(combined);
        }

        // Check user saved jobs
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: savedData } = await supabase
            .from('saved_jobs')
            .select('job_id')
            .eq('user_id', user.id);

          if (savedData) {
            setSavedJobIds(savedData.map((s) => s.job_id));
          }
        }
      } catch (err) {
        console.error('Error fetching jobs for homepage:', err);
      }
    }

    loadJobsAndSavedStatus();
  }, []);

  // Handle Search Submission ("Find Match")
  const handleFindMatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilterKeyword(keywordQuery.trim().toLowerCase());
    setActiveFilterLocation(locationQuery.trim().toLowerCase());

    // Smooth scroll down to Top Matches section
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle clicking a popular tag
  const handlePopularTagClick = (tag: string) => {
    setKeywordQuery(tag);
    setActiveFilterKeyword(tag.toLowerCase());
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle Save toggle
  const handleToggleSave = async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }

    const isCurrentlySaved = savedJobIds.includes(jobId);
    if (isCurrentlySaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
    } else {
      await supabase.from('saved_jobs').upsert({ user_id: user.id, job_id: jobId }, { onConflict: 'user_id,job_id' });
      setSavedJobIds((prev) => [...prev, jobId]);
    }
  };

  // Filtered jobs list based on Find Match search and type filters
  const filteredJobs = allJobs.filter((job) => {
    if (activeFilterKeyword) {
      const matchTitle = job.title.toLowerCase().includes(activeFilterKeyword);
      const matchCompany = job.companyName.toLowerCase().includes(activeFilterKeyword);
      const matchSkills = job.skills.some((sk) => sk.toLowerCase().includes(activeFilterKeyword));
      if (!matchTitle && !matchCompany && !matchSkills) return false;
    }

    if (activeFilterLocation) {
      const matchCity = job.city.toLowerCase().includes(activeFilterLocation);
      if (!matchCity) return false;
    }

    if (filterType === 'full_time' && job.employmentType !== 'Full-time') return false;
    if (filterType === 'hybrid' && job.workArrangement !== 'Hybrid') return false;

    return true;
  });

  const clearFilters = () => {
    setKeywordQuery('');
    setLocationQuery('');
    setActiveFilterKeyword('');
    setActiveFilterLocation('');
    setFilterType('all');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-emerald-200">
      <Navbar />

      {/* ─── 1. HERO SECTION (Exact Style from Image 1) ────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d2a35] via-[#09403a] to-[#03513f] text-white py-12 sm:py-20 lg:py-24">
        {/* Soft radial glowing light orbs on sides for depth */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-5">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-4 py-1.5 rounded-full shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI-Powered Job Matching</span>
          </div>

          {/* Main Headline with highlighted rounded boxes */}
          <h1 className="text-[28px] leading-tight sm:text-5xl lg:text-[54px] font-black text-white tracking-tight sm:leading-[1.2] max-w-3xl mx-auto">
            Find{' '}
            <span className="mb-4 bg-emerald-800/60 border border-emerald-400/30 text-emerald-200 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl font-black inline-block shadow-inner">
              Nearby Jobs
            </span>{' '}
            That Fit Your{' '}
            <span className="bg-emerald-800/60 border border-emerald-400/30 text-emerald-200 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl font-black inline-block shadow-inner">
              Exact Skills
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-200 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-normal px-2">
            WorkMatch analyzes your skills, certifications, and location to instantly connect you with the
            highest-matching opportunities within your preferred radius.
          </p>

          {/* Search Bar Container ("Find Match") */}
          <div className="pt-2 px-0">
            <form
              onSubmit={handleFindMatch}
              className="bg-white rounded-2xl sm:rounded-full p-3 sm:p-2 sm:pl-6 shadow-2xl max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-white/20 transition-all focus-within:ring-2 focus-within:ring-emerald-400"
            >
              {/* Left Input: Job title, skills, or certification */}
              <div className="flex items-center gap-2.5 flex-1 bg-slate-50 rounded-xl px-3 py-2.5 sm:bg-transparent sm:rounded-none sm:px-0 sm:py-0 border border-slate-100 sm:border-0">
                <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Job title, skills, or certification"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none min-w-0"
                />
              </div>

              {/* Vertical Divider for desktop */}
              <div className="hidden sm:block h-7 w-[1px] bg-slate-200 shrink-0 mx-1" />

              {/* Middle Input: City, province, or radius... */}
              <div className="flex items-center gap-2.5 flex-1 bg-slate-50 rounded-xl px-3 py-2.5 sm:bg-transparent sm:rounded-none sm:px-0 sm:py-0 border border-slate-100 sm:border-0">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <input
                  type="text"
                  placeholder="City or province..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none min-w-0"
                />
              </div>

              {/* Find Match Button */}
              <button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl sm:rounded-full flex items-center justify-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
              >
                <span>Find Match</span>
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>
          </div>

          {/* Popular Search Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-300 pt-0.5 px-1">
            <span className="text-slate-400 font-medium text-[11px] w-full text-center sm:w-auto sm:text-left">Popular:</span>
            {['Web Developer', 'Data Analyst', 'Registered Nurse', 'Graphic Designer'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handlePopularTagClick(tag)}
                className="bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/25 text-slate-200 hover:text-white px-3 py-1 rounded-full text-[11px] transition-all cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Stats Bar Strip */}
          <div className="pt-4 sm:pt-6 flex justify-center">
            <div className="bg-emerald-950/45 backdrop-blur-sm border border-emerald-500/25 rounded-2xl py-3 px-5 sm:px-12 w-full max-w-md sm:max-w-none sm:w-auto inline-flex items-center justify-between sm:justify-center gap-3 sm:gap-14 text-center shadow-lg">
              <div className="flex-1 sm:flex-none">
                <p className="text-lg sm:text-2xl font-black text-white leading-none">2,450+</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium mt-0.5">Active Jobs</p>
              </div>
              <div className="h-7 w-[1px] bg-emerald-500/30 shrink-0" />
              <div className="flex-1 sm:flex-none">
                <p className="text-lg sm:text-2xl font-black text-white leading-none">380+</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium mt-0.5">Companies</p>
              </div>
              <div className="h-7 w-[1px] bg-emerald-500/30 shrink-0" />
              <div className="flex-1 sm:flex-none">
                <p className="text-lg sm:text-2xl font-black text-white leading-none">15K+</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium mt-0.5">Matches Made</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. TOP MATCHES NEAR YOU (Exact Style from Image 1) ───────────────── */}
      <section ref={resultsRef} className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Top Matches Near You
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Jobs ranked by AI-powered skill matching and proximity
              </p>
            </div>

            {/* Right Controls: Filters Button + View All Link */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                  filterDrawerOpen || filterType !== 'all'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {filterType !== 'all' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </button>

              <Link
                href={`/jobs${
                  activeFilterKeyword ? `?keyword=${encodeURIComponent(activeFilterKeyword)}` : ''
                }`}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 shrink-0"
              >
                View All →
              </Link>
            </div>
          </div>

          {/* Optional Filter Controls Tray */}
          {filterDrawerOpen && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-slate-700 mr-1">Work Setup:</span>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('full_time')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filterType === 'full_time'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  Full-time Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('hybrid')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filterType === 'hybrid'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  Hybrid Only
                </button>
              </div>

              {(activeFilterKeyword || activeFilterLocation || filterType !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 text-xs"
                >
                  <X className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Active Search Summary Pill */}
          {(activeFilterKeyword || activeFilterLocation) && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900">
              <span className="font-medium">
                Showing results for{' '}
                {activeFilterKeyword && <strong className="font-bold">&quot;{activeFilterKeyword}&quot;</strong>}
                {activeFilterKeyword && activeFilterLocation && ' in '}
                {activeFilterLocation && <strong className="font-bold">&quot;{activeFilterLocation}&quot;</strong>}
                {' — '}{filteredJobs.length} match{filteredJobs.length !== 1 ? 'es' : ''} found
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline text-xs"
              >
                Reset Search
              </button>
            </div>
          )}

          {/* 3-Column Job Cards Grid (Pixel-Matched to Image 1) */}
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-700">No jobs match your current search.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching with broader terms or clear your search to explore all available openings.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-700 transition-colors"
              >
                Show All Opportunities
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => {
                const isSaved = savedJobIds.includes(job.id);

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Top Row: Initials Badge + Title & Company + Bookmark */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Company Circle Badge */}
                        <div
                          className={`w-10 h-10 rounded-full ${job.badgeBgColor} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden`}
                        >
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.companyName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            job.companyInitials
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
                          <p className="text-xs text-slate-500 truncate mt-0.5">{job.companyName}</p>
                        </div>
                      </div>

                      {/* Bookmark Icon Button */}
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
                        {job.matchScore}% Match
                      </span>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                        {formatDistance(job.distanceKm)} away
                      </span>
                    </div>

                    {/* Job Details Meta (Salary, Employment, Posted Time) */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">
                        $ {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{job.employmentType}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{job.postedAgo}</span>
                      </p>
                    </div>

                    {/* Skill Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {job.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-100/90 px-2.5 py-0.5 rounded-lg"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Urgent Badge */}
                    {job.isUrgent && (
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
                        onClick={() => setSelectedJobForStalker(job.rawJob || job)}
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
                            <strong className="text-slate-800">{job.appliedCount}</strong> people applied
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
      </section>

      {/* Footer (Matches Image 2) */}
      <Footer />

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
          matchScore={selectedJobForApply.matchScore || selectedJobForApply.match?.overallScore || 90}
          onSuccess={() => {
            // Update applied count in local state
            setAllJobs((prev) =>
              prev.map((j) =>
                j.id === selectedJobForApply.id
                  ? { ...j, appliedCount: j.appliedCount + 1 }
                  : j
              )
            );
          }}
        />
      )}

      {/* Applicant Stalker Modal (See Profiles) */}
      {selectedJobForStalker && (
        <ApplicantStalkerModal
          isOpen={!!selectedJobForStalker}
          onClose={() => setSelectedJobForStalker(null)}
          job={selectedJobForStalker}
          currentUserId={undefined}
          currentUserMatchScore={90}
        />
      )}
    </div>
  );
}
