'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  const handleResolve = async (reportId: string, status: 'resolved' | 'dismissed') => {
    await supabase
      .from('reports')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', reportId);
    fetchReports();
  };

  return (
    <DashboardLayout
      portal="admin"
      title="Reported Issues & Flags"
      subtitle="Investigate user reports regarding duplicate jobs, spam, or inappropriate behavior."
    >
      <div className="space-y-4 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-dark">No reports found</h3>
            <p className="text-xs text-muted">The platform report queue is clean. User flagged content will appear here.</p>
          </div>
        ) : (
          reports.map((rep) => (
            <div key={rep.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{rep.reason}</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                    rep.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {rep.status}
                </span>
              </div>

              <p className="text-xs text-slate-700">{rep.description}</p>
              <p className="text-[11px] text-muted">Reported on: {new Date(rep.created_at).toLocaleString()}</p>

              {rep.status === 'pending' && (
                <div className="pt-3 border-t border-border flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleResolve(rep.id, 'dismissed')}>
                    Dismiss
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleResolve(rep.id, 'resolved')}>
                    Resolve & Close
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
