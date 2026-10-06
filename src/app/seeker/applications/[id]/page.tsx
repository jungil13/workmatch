'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ApplicationPipeline } from '@/components/applications/ApplicationPipeline';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Video,
} from 'lucide-react';

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('applications')
      .select('*, job:jobs(*, company:companies(*)), interview:interviews(*)')
      .eq('id', resolvedParams.id)
      .maybeSingle()
      .then(({ data }) => {
        setApplication(data);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <DashboardLayout portal="seeker" title="Application Status">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout portal="seeker" title="Application Not Found">
        <div className="p-8 text-center space-y-4">
          <p className="text-xs text-muted">The requested application record could not be found.</p>
          <Link href="/seeker/applications">
            <Button variant="primary" size="sm">Back to Applications</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      portal="seeker"
      title="Application Status"
      subtitle={`Tracking application for ${application.job?.title} at ${application.job?.company?.name}`}
      actions={
        <Link href="/seeker/applications">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> All Applications
          </Button>
        </Link>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Job Header Card */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-border flex items-center justify-center overflow-hidden shrink-0">
              {application.job?.company?.logo_url ? (
                <img
                  src={application.job.company.logo_url}
                  alt={application.job.company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-mint-700">
                {application.job?.company?.name}
              </span>
              <h2 className="text-xl font-bold text-dark">{application.job?.title}</h2>
              <p className="text-xs text-muted">
                Applied on {new Date(application.applied_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Pipeline */}
        <ApplicationPipeline
          currentStatus={application.status}
          statusHistory={application.history as any}
        />



        {/* Cover Letter */}
        {application.cover_letter && (
          <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cover Note Submitted</h4>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
              {application.cover_letter}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
