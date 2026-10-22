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
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

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

        {application.status === 'offer' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-3">
            <h4 className="text-sm font-bold text-emerald-900">You have an offer</h4>
            <p className="text-xs text-emerald-800">
              Accepting confirms the hire, updates your availability, and notifies other employers with pending applications that you are no longer available. They will not see this company&apos;s offer details.
            </p>
            {offerMsg && <p className="text-xs font-semibold">{offerMsg}</p>}
            <div className="flex gap-2">
              <Button
                isLoading={offerBusy}
                onClick={async () => {
                  setOfferBusy(true);
                  const res = await fetch('/api/applications/offer-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: application.id, decision: 'accept' }),
                  });
                  const data = await res.json();
                  setOfferBusy(false);
                  setOfferMsg(data.error || 'Offer accepted. Your employment status is now hired.');
                  if (res.ok) setApplication((prev: any) => ({ ...prev, status: 'hired' }));
                }}
              >
                Accept offer
              </Button>
              <Button
                variant="outline"
                disabled={offerBusy}
                onClick={async () => {
                  setOfferBusy(true);
                  const res = await fetch('/api/applications/offer-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: application.id, decision: 'decline' }),
                  });
                  const data = await res.json();
                  setOfferBusy(false);
                  setOfferMsg(data.error || 'Offer declined.');
                  if (res.ok) setApplication((prev: any) => ({ ...prev, status: 'withdrawn' }));
                }}
              >
                Decline offer
              </Button>
            </div>
          </div>
        )}



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
