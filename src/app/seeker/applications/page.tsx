'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, MapPin, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-700',
  screening: 'bg-amber-50 text-amber-800 border border-amber-200',
  interview: 'bg-mint-50 text-mint-800 border border-mint-200',
  offer: 'bg-purple-50 text-purple-800 border border-purple-200',
  hired: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border border-rose-200',
};

export default function SeekerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('applications')
        .select('*, job:jobs(*, company:companies(*)), interview:interviews(*)')
        .eq('applicant_id', user.id)
        .order('applied_at', { ascending: false })
        .then(({ data }) => {
          setApplications(data ?? []);
          setLoading(false);
        });
    });
  }, []);

  const filtered = statusFilter === 'all' ? applications : applications.filter(a => a.status === statusFilter);
  const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

  return (
    <DashboardLayout
      portal="seeker"
      title="My Applications"
      subtitle="Track your active application statuses and interview schedules."
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${statusFilter === 'all' ? 'bg-dark text-white' : 'bg-white border border-border text-slate-600'}`}
          >
            All ({applications.length})
          </button>
          {stages.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${statusFilter === s ? 'bg-mint-500 text-white' : 'bg-white border border-border text-slate-600'}`}
            >
              {s} ({applications.filter(a => a.status === s).length})
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
            <h3 className="text-base font-bold text-dark">No applications yet</h3>
            <p className="text-xs text-muted">Start applying to jobs to track your progress here.</p>
            <Link href="/seeker/find-jobs">
              <Button variant="primary" size="sm">Browse Open Jobs</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app: any) => (
              <div key={app.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-dark">{app.job?.title}</h3>
                    <p className="text-xs font-semibold text-slate-600">
                      {app.job?.company?.name} • {app.job?.city}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize shrink-0 ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-700'}`}>
                    {app.status}
                  </span>
                </div>

                {app.interview && (
                  <div className="bg-mint-50 border border-mint-200 p-3.5 rounded-2xl text-xs space-y-1">
                    <p className="font-bold text-mint-900">Interview Scheduled</p>
                    <p className="text-mint-800">{new Date(app.interview.scheduled_at).toLocaleString()}</p>
                    {app.interview.meeting_url && (
                      <a href={app.interview.meeting_url} target="_blank" rel="noreferrer" className="text-mint-700 underline font-bold">
                        Join Meeting →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
