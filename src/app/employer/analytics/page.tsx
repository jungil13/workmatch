'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Progress } from '@/components/ui/Progress';
import { supabase } from '@/lib/supabase/client';
import {
  Users,
  Briefcase,
  Award,
  Clock,
} from 'lucide-react';

export default function EmployerAnalyticsPage() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplicants: 0,
    screeningCount: 0,
    interviewsCount: 0,
    offersCount: 0,
    hiredCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: ep } = await supabase.from('employer_profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (!ep?.company_id) { setLoading(false); return; }

      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('id').eq('company_id', ep.company_id),
        supabase.from('applications').select('status, job:jobs!inner(company_id)').eq('jobs.company_id', ep.company_id),
      ]);

      const jobs = jobsRes.data ?? [];
      const apps = appsRes.data ?? [];

      setStats({
        totalJobs: jobs.length,
        totalApplicants: apps.length,
        screeningCount: apps.filter((a: any) => a.status === 'screening').length,
        interviewsCount: apps.filter((a: any) => a.status === 'interview').length,
        offersCount: apps.filter((a: any) => a.status === 'offer').length,
        hiredCount: apps.filter((a: any) => a.status === 'hired').length,
      });
      setLoading(false);
    });
  }, []);

  const total = stats.totalApplicants || 1;
  const screeningPct = Math.round((stats.screeningCount / total) * 100);
  const interviewPct = Math.round((stats.interviewsCount / total) * 100);
  const hirePct = Math.round(((stats.offersCount + stats.hiredCount) / total) * 100);

  return (
    <DashboardLayout
      portal="employer"
      title="Recruitment Pipeline Analytics"
      subtitle="Data-driven hiring funnel conversions and pipeline volumes."
    >
      <div className="space-y-8 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-mint-500" /> Total Job Postings
                </span>
                <p className="text-3xl font-black text-dark">{stats.totalJobs}</p>
                <span className="text-[11px] text-slate-500 font-medium">Company openings</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-mint-500" /> Candidate Inflow
                </span>
                <p className="text-3xl font-black text-dark">{stats.totalApplicants}</p>
                <span className="text-[11px] text-emerald-700 font-bold">Applications received</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-mint-500" /> In Screening / Interview
                </span>
                <p className="text-3xl font-black text-mint-600">{stats.screeningCount + stats.interviewsCount}</p>
                <span className="text-[11px] text-mint-700 font-bold">Active in pipeline</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-mint-500" /> Successful Hires
                </span>
                <p className="text-3xl font-black text-emerald-600">{stats.hiredCount}</p>
                <span className="text-[11px] text-emerald-700 font-bold">{stats.offersCount} offers pending</span>
              </div>
            </div>

            {/* Funnel Pipeline Breakdown */}
            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="text-base font-bold text-dark">Recruitment Pipeline Conversion</h3>
                <span className="text-xs text-muted">{stats.totalApplicants} Total Inflow</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>1. Applied Candidates ({stats.totalApplicants})</span>
                    <span className="text-mint-700">100%</span>
                  </div>
                  <Progress value={100} size="md" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>2. In Screening ({stats.screeningCount})</span>
                    <span className="text-mint-700">{screeningPct}%</span>
                  </div>
                  <Progress value={screeningPct} size="md" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>3. Technical & Culture Interviews ({stats.interviewsCount})</span>
                    <span className="text-mint-700">{interviewPct}%</span>
                  </div>
                  <Progress value={interviewPct} size="md" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>4. Offers & Hires ({stats.offersCount + stats.hiredCount})</span>
                    <span className="text-emerald-700">{hirePct}%</span>
                  </div>
                  <Progress value={hirePct} size="md" variant="success" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

