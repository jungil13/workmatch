'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Users, Calendar, Award, PlusCircle, ArrowRight, ShieldCheck, AlertCircle, Clock, ShieldOff } from 'lucide-react';

export default function EmployerDashboardPage() {
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalApplicants: 0, interviewsCount: 0, offersCount: 0, hiredCount: 0, screeningCount: 0 });
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<string>('unverified');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: ep } = await supabase.from('employer_profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (!ep?.company_id) { setLoading(false); return; }
      setCompanyId(ep.company_id);
      const { data: company } = await supabase.from('companies').select('verification_status, verified').eq('id', ep.company_id).maybeSingle();
      if (company) {
        setVerificationStatus(company.verification_status || (company.verified ? 'approved' : 'unverified'));
      }
      fetchStats(ep.company_id);
    });
  }, []);

  async function fetchStats(cid: string) {
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from('jobs').select('id, status').eq('company_id', cid),
      supabase.from('applications').select('id, status, applicant:profiles(first_name, last_name), job:jobs!inner(title, company_id), interview:interviews(*)').eq('jobs.company_id', cid).order('applied_at', { ascending: false }).limit(5),
    ]);
    const jobs = jobsRes.data ?? [];
    const apps = appsRes.data ?? [];
    setStats({
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j: any) => j.status === 'published').length,
      totalApplicants: apps.length,
      screeningCount: apps.filter((a: any) => a.status === 'screening').length,
      interviewsCount: apps.filter((a: any) => a.status === 'interview').length,
      offersCount: apps.filter((a: any) => a.status === 'offer').length,
      hiredCount: apps.filter((a: any) => a.status === 'hired').length,
    });
    setRecentApps(apps);
    setLoading(false);
  }

  return (
    <DashboardLayout
      portal="employer"
      title="HR Recruitment Dashboard"
      subtitle="Manage job postings, applicant pipelines, and matched candidates."
      actions={
        <Link href="/employer/jobs/create">
          <Button variant="primary" size="sm"><PlusCircle className="w-4 h-4" /> Post a Job</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Verification Status Banner */}
        {!loading && (
          verificationStatus === 'approved' ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Company Verified ✓</p>
                <p className="text-xs text-emerald-700">Your business permit has been approved. You can post and publish jobs.</p>
              </div>
            </div>
          ) : verificationStatus === 'pending' ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-amber-900">Verification Pending</p>
                <p className="text-xs text-amber-700">Your business permit is under admin review. You can save job drafts but cannot publish until approved.</p>
              </div>
            </div>
          ) : verificationStatus === 'rejected' || verificationStatus === 'resubmission_required' ? (
            <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <ShieldOff className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-rose-900">{verificationStatus === 'resubmission_required' ? 'Resubmission Required' : 'Verification Rejected'}</p>
                  <p className="text-xs text-rose-700">Please go to Company Profile to re-upload your business permit with clearer documents.</p>
                </div>
              </div>
              <Link href="/employer/profile">
                <Button variant="outline" size="sm" className="text-rose-700 border-rose-300 hover:bg-rose-100 shrink-0">Update Permit</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Business Permit Required</p>
                  <p className="text-xs text-blue-700">Upload your business permit in Company Profile so an admin can verify your company to enable job publishing.</p>
                </div>
              </div>
              <Link href="/employer/profile">
                <Button variant="primary" size="sm" className="shrink-0">Submit Permit</Button>
              </Link>
            </div>
          )
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Briefcase, label: 'Active Job Postings', value: stats.activeJobs, sub: `${stats.totalJobs} Total` },
                { icon: Users, label: 'Total Applicants', value: stats.totalApplicants, sub: 'In pipeline' },
                { icon: Calendar, label: 'Interviews Scheduled', value: stats.interviewsCount, sub: 'Active' },
                { icon: Award, label: 'Offers & Hires', value: stats.offersCount + stats.hiredCount, sub: `${stats.hiredCount} Hired` },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                  <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-mint-500" /> {label}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-black text-dark">{value}</p>
                    <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md">{sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Applicants */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-dark">Recent Applicants</h3>
                <Link href="/employer/applicants">
                  <Button variant="outline" size="sm">View All <ArrowRight className="w-3.5 h-3.5" /></Button>
                </Link>
              </div>
              {recentApps.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-muted">No applicants yet. Post your first job to start receiving candidates.</p>
                  <Link href="/employer/jobs/create">
                    <Button variant="primary" size="sm"><PlusCircle className="w-4 h-4" /> Post a Job</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApps.map((app: any, idx: number) => (
                    <div key={app.id || idx} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-mint-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {app.applicant?.first_name?.[0]}{app.applicant?.last_name?.[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-dark">{app.applicant?.first_name} {app.applicant?.last_name}</h4>
                          <p className="text-[11px] text-muted">{app.job?.title}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold capitalize text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{app.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

