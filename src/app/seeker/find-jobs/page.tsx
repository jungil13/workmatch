'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange } from '@/lib/utils';
import { Briefcase, MapPin, Building2, Sparkles, Search, CheckCircle2, BookmarkCheck } from 'lucide-react';

export default function SeekerFindJobsPage() {
  const [userId, setUserId] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      Promise.all([
        fetchJobs(),
        fetchSavedJobs(user.id),
        fetchApplied(user.id),
      ]);
    });
  }, []);

  async function fetchJobs(filters?: { keyword?: string; city?: string; work_arrangement?: string }) {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters?.work_arrangement) query = query.eq('work_arrangement', filters.work_arrangement);
    if (filters?.keyword) query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);

    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  }

  async function fetchSavedJobs(uid: string) {
    const { data } = await supabase.from('saved_jobs').select('job_id').eq('user_id', uid);
    setSavedJobIds((data ?? []).map((s: any) => s.job_id));
  }

  async function fetchApplied(uid: string) {
    const { data } = await supabase.from('applications').select('job_id').eq('applicant_id', uid);
    setApplied((data ?? []).map((a: any) => a.job_id));
  }

  const handleSearch = () => fetchJobs({ keyword, city, work_arrangement: workArrangement });

  const handleToggleSave = async (jobId: string) => {
    if (!userId) return;
    if (savedJobIds.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
      setSavedJobIds(prev => prev.filter(id => id !== jobId));
    } else {
      await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId, saved_at: new Date().toISOString() });
      setSavedJobIds(prev => [...prev, jobId]);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!userId || applied.includes(jobId)) return;
    setApplying(jobId);
    await supabase.from('applications').insert({
      applicant_id: userId,
      job_id: jobId,
      status: 'applied',
      match_score: 0,
      cover_letter: '',
      applied_at: new Date().toISOString(),
    });
    setApplied(prev => [...prev, jobId]);
    setApplying(null);
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Find Jobs"
      subtitle="Search and apply to openings that match your verified skills and location."
    >
      <div className="space-y-6">
        {/* Search Filters */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-soft grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input placeholder="Job title or keyword..." icon={<Search className="w-4 h-4" />} value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <select value={city} onChange={e => setCity(e.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
            <option value="">All Locations</option>
            <option value="Cebu City">Cebu City</option>
            <option value="Mandaue">Mandaue City</option>
            <option value="Taguig">Taguig / BGC</option>
            <option value="Makati">Makati City</option>
            <option value="Manila">Manila</option>
            <option value="Davao">Davao City</option>
          </select>
          <Button variant="primary" size="md" onClick={handleSearch}>
            <Search className="w-4 h-4" /> Search Jobs
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No job openings found</h3>
            <p className="text-xs text-muted">Employers haven't posted any jobs yet, or no jobs match your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <div key={job.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3 hover:border-mint-200 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                        {job.employment_type} • {job.work_arrangement}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-dark">{job.title}</h3>
                    <p className="text-xs font-semibold text-slate-600">{job.company?.name}</p>
                    <p className="text-xs font-bold text-dark">{formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleSave(job.id)}
                      className={`p-2 rounded-xl border transition-colors ${savedJobIds.includes(job.id) ? 'bg-mint-50 border-mint-300 text-mint-600' : 'border-border text-slate-400 hover:text-mint-600'}`}
                      title={savedJobIds.includes(job.id) ? 'Unsave' : 'Save job'}
                    >
                      <BookmarkCheck className="w-4 h-4" />
                    </button>
                    <Button
                      variant={applied.includes(job.id) ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleApply(job.id)}
                      isLoading={applying === job.id}
                      disabled={applied.includes(job.id)}
                      className="font-bold"
                    >
                      {applied.includes(job.id) ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Applied</>
                      ) : 'Quick Apply'}
                    </Button>
                  </div>
                </div>
                {job.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{job.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
