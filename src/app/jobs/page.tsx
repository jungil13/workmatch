'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters, FilterState } from '@/components/jobs/JobFilters';
import { supabase } from '@/lib/supabase/client';
import { Sparkles, Briefcase } from 'lucide-react';

export default function PublicJobsPage() {
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    city: 'All Cities',
    workArrangement: 'All',
    experienceLevel: 'All Levels',
    maxDistanceKm: undefined,
    minSalary: 0,
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  async function fetchJobs() {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (filters.city && filters.city !== 'All Cities') {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.workArrangement && filters.workArrangement !== 'All') {
      query = query.eq('work_arrangement', filters.workArrangement);
    }
    if (filters.experienceLevel && filters.experienceLevel !== 'All Levels') {
      query = query.eq('experience_level', filters.experienceLevel);
    }
    if (filters.minSalary > 0) {
      query = query.gte('salary_max', filters.minSalary);
    }
    if (filters.keyword.trim()) {
      query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);
    }

    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  }

  const handleReset = () => {
    setFilters({
      keyword: '',
      city: 'All Cities',
      workArrangement: 'All',
      experienceLevel: 'All Levels',
      maxDistanceKm: undefined,
      minSalary: 0,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        {/* Header Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
            <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Real-Time Opportunities
          </div>
          <h1 className="text-3xl font-black text-dark tracking-tight">
            Find Your Next Career Match
          </h1>
          <p className="text-sm text-muted">
            Explore verified opportunities across Cebu, Metro Manila, Davao, and nationwide remote.
          </p>
        </div>

        {/* Filter Controls */}
        <JobFilters filters={filters} onChange={setFilters} onReset={handleReset} />

        {/* Job Listings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Showing <strong className="text-dark">{jobs.length}</strong> matching roles
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-dark">No matching jobs found</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Try widening your search filters or resetting your keyword search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
