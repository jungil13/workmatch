'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Building2, MapPin, BookmarkCheck, Trash2, ArrowRight } from 'lucide-react';
import { formatSalaryRange } from '@/lib/utils';

export default function SeekerSavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('saved_jobs')
        .select('*, job:jobs(*, company:companies(*))')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false })
        .then(({ data }) => {
          setSavedJobs(data ?? []);
          setLoading(false);
        });
    });
  }, []);

  const handleUnsave = async (savedJobId: string) => {
    await supabase.from('saved_jobs').delete().eq('id', savedJobId);
    setSavedJobs(prev => prev.filter(s => s.id !== savedJobId));
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Saved Jobs"
      subtitle="Jobs you've bookmarked for later review."
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <BookmarkCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No saved jobs yet</h3>
            <p className="text-xs text-muted">Bookmark jobs while browsing to review them here later.</p>
            <Link href="/seeker/find-jobs">
              <Button variant="primary" size="sm">Browse Open Jobs</Button>
            </Link>
          </div>
        ) : (
          savedJobs.map((saved: any) => (
            <div key={saved.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                    {saved.job?.employment_type}
                  </span>
                </div>
                <h3 className="text-base font-bold text-dark">{saved.job?.title}</h3>
                <p className="text-xs text-slate-600 font-semibold">{saved.job?.company?.name}</p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-mint-500" /> {saved.job?.city}
                </p>
                <p className="text-xs font-bold text-dark">
                  {formatSalaryRange(saved.job?.salary_min, saved.job?.salary_max, saved.job?.salary_currency)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/jobs/${saved.job?.id}`}>
                  <Button variant="primary" size="sm">View Job <ArrowRight className="w-3.5 h-3.5" /></Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => handleUnsave(saved.id)} className="text-rose-500 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
