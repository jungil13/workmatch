'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, MapPin } from 'lucide-react';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*, company:companies(*)')
      .order('created_at', { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }

  const handleToggleJob = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'closed' : 'published';
    await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', jobId);
    fetchJobs();
  };

  return (
    <DashboardLayout
      portal="admin"
      title="Job Moderation"
      subtitle="Monitor active job openings, applicant pipelines, and moderate listings."
    >
      <div className="space-y-4 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No job postings in database</h3>
            <p className="text-xs text-muted">When employers post jobs, they will appear here for platform moderation.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-3xl border border-border p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                    {job.company?.name || 'Company'}
                  </span>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city}
                  </span>
                </div>
                <h3 className="text-base font-bold text-dark">{job.title}</h3>
                <p className="text-xs text-muted">
                  {job.employment_type} • {job.work_arrangement}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                  job.status === 'published' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {job.status}
                </span>
                <Button
                  variant={job.status === 'published' ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleJob(job.id, job.status)}
                >
                  {job.status === 'published' ? 'Take Down' : 'Re-Publish'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
