'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  Users,
  Briefcase,
  FileCheck2,
  Sparkles,
  CheckCircle2,
  Activity,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    jobSeekers: 0,
    employers: 0,
    activeJobs: 0,
    companies: 0,
    verifiedDocuments: 0,
    pendingDocuments: 0,
    avgMatch: 0,
  });
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const [
      { count: totalUsers },
      { count: seekers },
      { count: employers },
      { count: activeJobs },
      { count: companies },
      { count: verifiedDocs },
      { count: pendingDocsCount },
      docsRes,
      logsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'job_seeker'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(4),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6),
    ]);

    setStats({
      totalUsers: totalUsers ?? 0,
      jobSeekers: seekers ?? 0,
      employers: employers ?? 0,
      activeJobs: activeJobs ?? 0,
      companies: companies ?? 0,
      verifiedDocuments: verifiedDocs ?? 0,
      pendingDocuments: pendingDocsCount ?? 0,
      avgMatch: 0,
    });
    setPendingDocs(docsRes.data ?? []);
    setAuditLogs(logsRes.data ?? []);
    setLoading(false);
  }

  return (
    <DashboardLayout
      portal="admin"
      title="Platform Command Center"
      subtitle="Real-time WorkMatch database metrics, verification queues, and audit events."
      actions={
        <Link href="/admin/documents">
          <Button variant="primary" size="sm" className="shadow-sm">
            <FileCheck2 className="w-4 h-4" /> Verification Queue ({stats.pendingDocuments})
          </Button>
        </Link>
      }
    >
      <div className="space-y-8 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-mint-500" /> Total Registered Users
                </span>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-black text-dark">{stats.totalUsers}</p>
                  <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md">
                    {stats.jobSeekers} Seekers • {stats.employers} Employers
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-mint-500" /> Live Job Listings
                </span>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-black text-dark">{stats.activeJobs}</p>
                  <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md">
                    Across {stats.companies} Companies
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-mint-500" /> Verified Credentials
                </span>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-black text-emerald-600">{stats.verifiedDocuments}</p>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                    {stats.pendingDocuments} Pending
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-mint-500" /> Platform Status
                </span>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-mint-600">Online</p>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Live Supabase
                  </span>
                </div>
              </div>
            </div>

            {/* Action Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Pending Document Verification Queue */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-border p-6 shadow-soft space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold text-dark">Document Verification Queue</h3>
                    <p className="text-xs text-muted">College diplomas and credentials awaiting review.</p>
                  </div>
                  <Link href="/admin/documents">
                    <Button variant="outline" size="sm">
                      Manage Queue <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {pendingDocs.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs text-muted">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingDocs.map((doc) => {
                      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path || '');
                      const isImg = doc.mime_type?.startsWith('image/') || doc.file_name?.match(/\.(jpg|jpeg|png|webp)$/i);

                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4 hover:bg-slate-100/70 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
                              {isImg ? (
                                <img
                                  src={data.publicUrl}
                                  alt={doc.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-mint-600">PDF</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-dark truncate">{doc.file_name}</h4>
                              <p className="text-[11px] text-muted">
                                {new Date(doc.uploaded_at).toLocaleDateString()} • {(doc.file_size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {doc.verification_status === 'verified' ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                              </span>
                            ) : (
                              <Link href="/admin/documents">
                                <Button variant="primary" size="sm" className="h-8 text-xs font-bold">
                                  Review
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Live Audit Log Trail */}
              <div className="lg:col-span-5 bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-mint-400" /> Real-Time Audit Trail
                  </h3>
                  <Link href="/admin/audit-logs" className="text-xs text-mint-400 hover:underline">
                    View All
                  </Link>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No audit events recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs space-y-1">
                        <p className="font-semibold text-white">{log.action}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{log.user_email || 'System'}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
