'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/notifications';
import {
  Users,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Download,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'screening', label: 'Under Review', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'hired', label: 'Contacted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'rejected', label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-200' },
];

export default function EmployerApplicantsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('applied');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any = null;
    fetchApplications().then(() => {
      channel = supabase
        .channel(`public:applications:employer-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'applications' },
          () => {
            fetchApplications();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function fetchApplications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: ep } = await supabase
      .from('employer_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ep?.company_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs!inner(title, company_id, city),
        resume:documents(*),
        applicant:profiles(
          id, first_name, last_name, email, phone, avatar_url,
          job_seeker_profile:job_seeker_profiles(city, province, professional_title, bio),
          skills:job_seeker_skills(id, proficiency, skill:skills(name))
        )
      `)
      .eq('jobs.company_id', ep.company_id)
      .order('applied_at', { ascending: false });

    setApplications(data ?? []);
    setLoading(false);
  }

  const handleDownloadResume = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error downloading resume:', err);
      alert('Failed to download resume. Please try again later.');
    }
  };

  const handleQuickStatusChange = async (appId: string, newStatus: string) => {
    const targetApp = applications.find((a) => a.id === appId);

    await supabase
      .from('applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId);

    // Notify candidate
    if (targetApp?.applicant_id) {
      const label = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus;
      await sendNotification({
        userId: targetApp.applicant_id,
        type: 'status_update',
        title: 'Application Status Updated',
        message: `Your application for ${targetApp.job?.title || 'the position'} is now marked as "${label}".`,
        link: '/seeker/applications',
      });
    }

    fetchApplications();
  };

  const handleOpenMoveModal = (app: any) => {
    setSelectedApp(app);
    setTargetStatus(app.status || 'applied');
    setStatusNotes('');
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsUpdating(true);

    await supabase
      .from('applications')
      .update({
        status: targetStatus,
        recruiter_notes: statusNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedApp.id);

    // Notify candidate
    if (selectedApp.applicant_id) {
      const label = STATUS_OPTIONS.find((s) => s.value === targetStatus)?.label || targetStatus;
      await sendNotification({
        userId: selectedApp.applicant_id,
        type: 'status_update',
        title: 'Application Status Updated',
        message: `Your application for ${selectedApp.job?.title || 'the position'} is now marked as "${label}".`,
        link: '/seeker/applications',
      });
    }

    setIsUpdating(false);
    setSelectedApp(null);
    fetchApplications();
  };

  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  const getStatusDisplay = (st?: string) => {
    return STATUS_OPTIONS.find((s) => s.value === st) || {
      value: st || 'applied',
      label: st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Pending',
      color: 'text-slate-700 bg-slate-100 border-slate-200',
    };
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Applicants"
      subtitle="View candidate contact details to call or email them directly. Update their application status with a single click."
    >
      <div className="space-y-6 max-w-7xl">
        {/* Simple Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Applicants ({applications.length})
          </button>
          {STATUS_OPTIONS.map((stg) => {
            const count = applications.filter((a) => a.status === stg.value).length;
            return (
              <button
                key={stg.value}
                onClick={() => setStatusFilter(stg.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === stg.value
                    ? 'bg-[#00b074] text-white shadow-xs'
                    : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                {stg.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No applicants found in this status</h3>
            <p className="text-xs text-muted">
              Applicants will appear here as candidates submit their applications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => {
              const statusInfo = getStatusDisplay(app.status);
              const phone = app.applicant?.phone || '+63 917 123 4567';
              const email = app.applicant?.email;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Header: Avatar, Name, Job Applied */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {app.applicant?.avatar_url ? (
                          <img
                            src={app.applicant.avatar_url}
                            alt={app.applicant.first_name || 'Applicant'}
                            className="w-12 h-12 rounded-full object-cover border border-emerald-200 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#00b074] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {app.applicant?.first_name?.[0] || 'U'}
                            {app.applicant?.last_name?.[0] || ''}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {app.applicant?.first_name} {app.applicant?.last_name}
                          </h4>
                          <p className="text-xs text-emerald-700 font-semibold truncate">
                            {app.job?.title}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.color} shrink-0`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Direct Contact Card (Call & Email) */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Contact Details
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#00b074] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{phone}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">(Call)</span>
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}?subject=Application for ${encodeURIComponent(app.job?.title || 'Job Opening')}`}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#00b074] transition-colors truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{email}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-auto">(Email)</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Location & Applied Date */}
                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {app.applicant?.job_seeker_profile?.city || app.job?.city || 'Location unspecified'}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        Applied on {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Download Resume */}
                    {app.resume && (
                      <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-semibold truncate max-w-[150px] text-slate-700">
                          📄 {app.resume.file_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadResume(app.resume.file_path)}
                          className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Resume
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Status Bar & Details Link */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenMoveModal(app)}
                      className="text-xs font-bold text-slate-700 hover:text-[#00b074] flex items-center gap-1 transition-colors"
                    >
                      Update Status <ChevronDown className="w-3 h-3" />
                    </button>

                    <Link href={`/employer/applicants/${app.id}`}>
                      <Button variant="outline" size="sm" className="text-xs font-semibold">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simple Status Change Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title="Update Applicant Status"
        description={`Set status for ${selectedApp?.applicant?.first_name} ${selectedApp?.applicant?.last_name}`}
      >
        <form onSubmit={handleConfirmStatusChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Application Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((stg) => (
                <button
                  type="button"
                  key={stg.value}
                  onClick={() => setTargetStatus(stg.value)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                    targetStatus === stg.value
                      ? 'border-[#00b074] bg-emerald-50/60 text-[#008f5d]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{stg.label}</span>
                  {targetStatus === stg.value && <Check className="w-4 h-4 text-[#00b074]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Internal HR Notes (Optional)</label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g., Called candidate on 10/6, agreed to discuss terms via email..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isUpdating}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
