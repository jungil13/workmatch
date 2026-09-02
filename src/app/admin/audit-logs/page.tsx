'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase/client';
import { AuditLog } from '@/types/database';
import { Activity } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs((data ?? []) as AuditLog[]);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout
      portal="admin"
      title="Platform Audit Trail"
      subtitle="Immutable event logs recording administrative decisions, document verifications, and system events."
    >
      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-soft max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No audit logs recorded yet</h3>
            <p className="text-xs text-muted">Administrative actions, role updates, and document verification events will log here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Actor / User</th>
                  <th className="py-4 px-6">Action Event</th>
                  <th className="py-4 px-6">Entity</th>
                  <th className="py-4 px-6">Metadata (JSONB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors font-mono">
                    <td className="py-4 px-6 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-bold text-dark text-xs font-sans">
                      {log.user_email || 'System Root'}
                    </td>
                    <td className="py-4 px-6 text-slate-800 font-sans font-semibold">
                      {log.action}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-mint-50 text-mint-800 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '{}'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
