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
  FileCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatSalaryRange } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  applied: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  screening: { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  hired: { label: 'Contacted', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

const STAGES = [
  { key: 'applied', label: 'Pending' },
  { key: 'screening', label: 'Under Review' },
  { key: 'hired', label: 'Contacted' },
  { key: 'rejected', label: 'Rejected' },
];

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

  return (
    <DashboardLayout
      portal="seeker"
      title="My Applications"
      subtitle="Track your active job application statuses and recruiter responses in real-time."
      actions={
        <Link href="/jobs">
          <Button variant="primary" size="sm" className="shadow-xs font-semibold">
            <Sparkles className="w-4 h-4" /> Find More Jobs
          </Button>
        </Link>
      }
    >
      <div className="space-y-6 max-w-7xl">
        {/* Stage Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Applications ({applications.length})
          </button>
          {STAGES.map((stg) => {
            const count = applications.filter((a) => a.status === stg.key).length;
            return (
              <button
                key={stg.key}
                onClick={() => setStatusFilter(stg.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === stg.key
                    ? 'bg-[#00b074] text-white shadow-xs'
                    : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                {stg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No applications found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              You haven&apos;t applied to any jobs matching this status yet.
            </p>
            <Link href="/jobs">
              <Button variant="outline" size="sm" className="mt-2">
                Browse Open Opportunities
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              const statusInfo = STATUS_CONFIG[app.status] || {
                label: app.status || 'Pending',
                color: 'bg-slate-100 text-slate-700',
              };

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {app.job?.company?.name?.slice(0, 2).toUpperCase() || 'WM'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-slate-900 truncate">
                          {app.job?.title}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {app.job?.company?.name} · {app.job?.city || 'Remote'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            ₱ {formatSalaryRange(app.job?.salary_min, app.job?.salary_max, app.job?.salary_currency)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Applied on {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      <Link href={`/seeker/applications/${app.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-semibold">
                          View Status <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Attached Resume */}
                  {app.resume && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                      <FileCheck className="w-4 h-4 text-[#00b074] shrink-0" />
                      <span className="font-semibold text-slate-700">Attached Resume:</span>
                      <span className="truncate">{app.resume.file_name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
