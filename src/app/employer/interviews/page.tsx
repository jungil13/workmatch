'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  Calendar,
  Video,
  Clock,
} from 'lucide-react';

export default function EmployerInterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: ep } = await supabase.from('employer_profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (!ep?.company_id) { setLoading(false); return; }

      const { data } = await supabase
        .from('interviews')
        .select(`
          *,
          application:applications!inner(
            id, status, match_score,
            job:jobs!inner(title, company_id),
            applicant:profiles(first_name, last_name, email)
          )
        `)
        .eq('application.job.company_id', ep.company_id)
        .order('scheduled_at', { ascending: true });

      setInterviews(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout
      portal="employer"
      title="Interview Calendar & Schedule"
      subtitle="Manage scheduled video interviews and technical screening panels."
      actions={
        <Link href="/employer/applicants">
          <Button variant="primary" size="sm">
            <Calendar className="w-4 h-4" /> Schedule from Pipeline
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No upcoming interviews</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Screen applicants in your pipeline and schedule candidate interview sessions.
            </p>
            <Link href="/employer/applicants">
              <Button variant="primary" size="sm">Go to Pipeline</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {interviews.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md capitalize">
                      {item.status || 'Scheduled'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-dark">
                      {item.application?.applicant?.first_name} {item.application?.applicant?.last_name}
                    </h3>
                    <p className="text-xs text-mint-700 font-semibold">{item.application?.job?.title}</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-700">
                    <p className="font-bold text-dark flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-mint-600" />
                      {new Date(item.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-muted text-[11px]">
                      Duration: {item.duration_minutes || 45} mins â€¢ {item.notes || 'Interview'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  {item.meeting_url ? (
                    <a
                      href={item.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Meeting
                    </a>
                  ) : (
                    <span className="text-xs text-muted">No link provided</span>
                  )}

                  <Link href={`/employer/applicants/${item.application?.id}`}>
                    <Button variant="outline" size="sm">
                      Applicant Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

