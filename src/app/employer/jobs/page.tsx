'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { formatSalaryRange } from '@/lib/utils';
import { Briefcase, PlusCircle, Users, Eye, Calendar, MapPin } from 'lucide-react';

export default function EmployerJobsPage() {
  const [tab, setTab] = useState<'published' | 'draft' | 'closed'>('published');
  const [jobs, setJobs] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: ep } = await supabase.from('employer_profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (ep?.company_id) {
        setCompanyId(ep.company_id);
        fetchJobs(ep.company_id);
      } else setLoading(false);
    });
  }, []);

  async function fetchJobs(cid: string) {
    const { data } = await supabase.from('jobs').select('*').eq('company_id', cid).order('created_at', { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }

  const filtered = jobs.filter(j => j.status === tab);

  const handleToggleStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'closed' : 'published';
    await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Job Postings"
      subtitle="Manage your active listings, drafts, and closed positions."
      actions={
        <Link href="/employer/jobs/create">
          <Button variant="primary" size="sm"><PlusCircle className="w-4 h-4" /> Post New Job</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          {(['published', 'draft', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${tab === s ? 'bg-mint-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {s === 'published' ? 'Active' : s.charAt(0).toUpperCase() + s.slice(1)} ({jobs.filter(j => j.status === s).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No {tab} jobs</h3>
            <p className="text-xs text-muted">Post your first job opening to start receiving AI-matched applicants.</p>
            <Link href="/employer/jobs/create">
              <Button variant="primary" size="sm"><PlusCircle className="w-4 h-4" /> Create Job Posting</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((job: any) => (
              <div key={job.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                        {job.employment_type} â€¢ {job.work_arrangement}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-dark">{job.title}</h3>
                    <p className="text-xs font-semibold text-slate-700">{formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href="/employer/applicants">
                      <Button variant="primary" size="sm"><Users className="w-4 h-4" /> View Applicants</Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(job.id, job.status)}
                      className={job.status === 'published' ? 'text-rose-600 hover:bg-rose-50' : 'text-mint-700 hover:bg-mint-50'}
                    >
                      {job.status === 'published' ? 'Close Job' : 'Republish'}
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-muted block text-[10px]">Deadline</span>
                      <strong className="text-dark">{job.application_deadline ?? 'Open'}</strong>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${job.status === 'published' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

