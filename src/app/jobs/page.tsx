'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { JobCard } from '@/components/jobs/JobCard';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Search, Sparkles, X } from 'lucide-react';

export default function PublicJobsPage() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateSkillNames, setCandidateSkillNames] = useState<string[]>([]);

  // Load current user's skills for skill matching display
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: skills } = await supabase
        .from('job_seeker_skills')
        .select('skill:skills(name)')
        .eq('user_id', user.id);
      if (skills) {
        setCandidateSkillNames(
          skills.map((s: any) => (s.skill?.name || '').toLowerCase()).filter(Boolean)
        );
      }
    });
  }, []);

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, city, workArrangement]);

  async function fetchJobs() {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (city) query = query.ilike('city', `%${city}%`);
    if (workArrangement) query = query.eq('work_arrangement', workArrangement);
    if (keyword.trim()) {
      query = query.or(`title.ilike.%${keyword.trim()}%,description.ilike.%${keyword.trim()}%`);
    }

    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        {/* Header */}
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

        {/* Live Search & Filter Controls */}
        <div className="bg-white rounded-3xl border border-border p-4 sm:p-5 shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-mint-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Live search: Job title, keywords, skills..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-11 pl-10 pr-9 rounded-xl border border-border bg-white text-xs text-dark placeholder:text-slate-400 focus:border-mint-500 focus:outline-none"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          <div className="lg:col-span-2">
            <div className="flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl bg-mint-50/70 border border-mint-200 text-xs font-bold text-mint-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Filter Active
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span>
            Found <strong className="text-dark font-bold">{jobs.length}</strong> available positions
          </span>
          <span className="flex items-center gap-1 text-mint-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Instant real-time results as you type
          </span>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3 shadow-soft">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No job openings found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Try adjusting your live keywords or clearing location filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setKeyword(''); setCity(''); setWorkArrangement(''); }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                candidateSkillNames={candidateSkillNames}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
