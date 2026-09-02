'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileCheck,
  Sparkles,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { formatSalaryRange } from '@/lib/utils';

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
        .select(`
          *,
          job:jobs(*, company:companies(*)),
          interview:interviews(*),
          resume:documents(*)
        `)
        .eq('applicant_id', user.id)
        .order('applied_at', { ascending: false })
        .then(({ data }) => {
          setApplications(data ?? []);
          setLoading(false);
        });
    });
  }, []);

  const filtered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter);
  const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

  return (
    <DashboardLayout
      portal="seeker"
      title="My Applications"
      subtitle="Track your active job application statuses, submitted resumes, and scheduled interview meetings."
      actions={
        <Link href="/seeker/find-jobs">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Sparkles className="w-4 h-4" /> Browse More Jobs
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-dark text-white shadow-sm'
                : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({applications.length})
          </button>
          {stages.map((s) => {
            const count = applications.filter((a) => a.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-mint-500 text-white shadow-sm'
                    : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3 shadow-soft">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No applications found in this stage</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Start applying to verified opportunities to track recruiter reviews and interviews.
            </p>
            <div className="pt-2">
              <Link href="/seeker/find-jobs">
                <Button variant="primary" size="sm">
                  Browse Open Jobs
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app: any) => (
              <div
                key={app.id}
                className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4 hover:border-mint-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                        {app.job?.employment_type || 'Full-time'} • {app.job?.work_arrangement || 'Hybrid'}
                      </span>
                      {app.match_score > 0 && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" /> {app.match_score}% Match
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-dark">{app.job?.title}</h3>
                    <p className="text-xs font-semibold text-slate-600">
                      {app.job?.company?.name} • {app.job?.city || 'Remote'}
                    </p>

                    <p className="text-xs text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${
                        STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {app.status}
                    </span>

                    <Link href={`/jobs/${app.job_id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Job <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Attached Resume Badge (if present) */}
                {app.resume && (
                  <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <FileCheck className="w-4 h-4 text-mint-600 shrink-0" />
                    <span className="font-semibold">Attached Resume:</span>
                    <span className="truncate max-w-xs">{app.resume.file_name}</span>
                  </div>
                )}

                {/* Scheduled Interview Card */}
                {app.interview && (Array.isArray(app.interview) ? app.interview.length > 0 : true) && (
                  (() => {
                    const interview = Array.isArray(app.interview) ? app.interview[0] : app.interview;
                    return (
                      <div className="bg-mint-50 border border-mint-200 p-4 rounded-2xl text-xs space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-mint-950">
                          <Calendar className="w-4 h-4 text-mint-600" /> Interview Scheduled
                        </div>
                        <p className="text-mint-900 font-medium">
                          Date & Time: {new Date(interview.scheduled_at).toLocaleString()}
                        </p>
                        {interview.meeting_url && (
                          <div className="pt-1">
                            <a
                              href={interview.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-mint-700 hover:underline bg-white px-3 py-1 rounded-lg border border-mint-200 shadow-xs"
                            >
                              Join Meeting Video Call <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
