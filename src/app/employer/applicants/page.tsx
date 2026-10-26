'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { downloadDocument } from '@/lib/services/resumeService';
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
  Trophy,
  Medal,
  Calendar,
  Video,
  Building2,
  Link2,
  Star,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'screening', label: 'Under Review', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'interview', label: 'Interview', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  { value: 'hired', label: 'Hired', color: 'text-emerald-800 bg-emerald-100 border-emerald-300' },
  { value: 'rejected', label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { value: 'closed', label: 'Closed', color: 'text-slate-700 bg-slate-100 border-slate-300' },
];
const EMPLOYER_ACTION_STATUSES = STATUS_OPTIONS.filter((status) => status.value !== 'hired');

const RANK_STYLES = [
  { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-500 text-white', icon: <Trophy className="w-3.5 h-3.5" />, label: '#1 Top Match' },
  { bg: 'bg-slate-50 border-slate-300', badge: 'bg-slate-400 text-white', icon: <Medal className="w-3.5 h-3.5" />, label: '#2 Runner-up' },
  { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-400 text-white', icon: <Medal className="w-3.5 h-3.5" />, label: '#3 Strong Fit' },
  { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-400 text-white', icon: <Star className="w-3.5 h-3.5" />, label: '#4 Good Fit' },
  { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500 text-white', icon: <Star className="w-3.5 h-3.5" />, label: '#5 Solid Pick' },
];

export default function EmployerApplicantsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('applied');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Interview modal state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewType, setInterviewType] = useState<'online' | 'onsite'>('online');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');

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

  const applicantProfileIds = Array.from(new Set(
    applications.map((application) => application.applicant?.id).filter(Boolean)
  )).sort();
  const applicantProfileIdsKey = applicantProfileIds.join(',');

  useEffect(() => {
    if (!applicantProfileIds.length) return;
    const channel = supabase.channel(`candidate-employment-${Date.now()}`);
    applicantProfileIds.forEach((userId) => {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'job_seeker_profiles', filter: `user_id=eq.${userId}` },
        () => {
          fetchApplications();
        }
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicantProfileIdsKey]);

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
          job_seeker_profile:job_seeker_profiles(city, province, professional_title, bio, employment_status, hired_application_id),
          skills:job_seeker_skills(id, proficiency, skill:skills(name)),
          educations(*),
          work_experiences(*),
          notifications(*)
        )
      `)
      .eq('jobs.company_id', ep.company_id)
      .order('applied_at', { ascending: false });

    setApplications(data ?? []);
    setLoading(false);
  }

  const handleDownloadResume = async (doc: any, applicant?: any) => {
    if (!doc) return;
    try {
      const profileData = applicant ? {
        profile: applicant,
        seekerProfile: applicant.job_seeker_profile ?? {},
        skills: applicant.skills ?? [],
        educations: applicant.educations ?? [],
        experiences: applicant.work_experiences ?? [],
      } : undefined;

      await downloadDocument(doc, doc.file_name, profileData, doc.user_id);
    } catch (err: any) {
      console.error('Error downloading resume:', err);
      alert(err.message || 'Failed to download resume. Please try again later.');
    }
  };

  const handleQuickStatusChange = async (appId: string, newStatus: string) => {
    const targetApp = applications.find((application) => application.id === appId);
    if (!targetApp || isCandidateHiredElsewhere(targetApp) || targetApp.status === 'rejected') return;

    const response = await fetch('/api/applications/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, status: newStatus }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'Could not update application status.');
      return;
    }

    fetchApplications();
  };

  const handleOpenMoveModal = (app: any) => {
    setSelectedApp(app);
    setTargetStatus(app.status || 'applied');
    setStatusNotes('');
    setShowInterviewModal(false);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewType('online');
    setInterviewLink('');
    setInterviewLocation('');
    setInterviewNotes('');
  };

  // When user clicks Save Status - check if interview, if so open interview detail form
  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (targetStatus === 'interview' && !showInterviewModal) {
      setShowInterviewModal(true);
      return;
    }

    setIsUpdating(true);

    const response = await fetch('/api/applications/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: selectedApp.id, status: targetStatus, notes: statusNotes }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'Could not update application status.');
      setIsUpdating(false);
      return;
    }

    // If interview, schedule it and notify the seeker
    if (targetStatus === 'interview') {
      await scheduleInterviewAndNotify();
    }

    setIsUpdating(false);
    setSelectedApp(null);
    setShowInterviewModal(false);
    await fetchApplications();
  };

  const scheduleInterviewAndNotify = async () => {
    if (!selectedApp) return;

    const applicantId = selectedApp.applicant?.id;
    if (!applicantId) return;

    const scheduledAt = interviewDate && interviewTime
      ? new Date(`${interviewDate}T${interviewTime}`).toISOString()
      : null;

    // Insert interview record
    if (scheduledAt) {
      await supabase.from('interviews').insert({
        application_id: selectedApp.id,
        scheduled_at: scheduledAt,
        interview_type: interviewType,
        meeting_url: interviewType === 'online' ? (interviewLink || null) : null,
        location: interviewType === 'onsite' ? (interviewLocation || null) : null,
        notes: interviewNotes || null,
        status: 'scheduled',
      });
    }

    // Build notification message
    const jobTitle = selectedApp.job?.title || 'the position';
    const applicantName = `${selectedApp.applicant?.first_name || ''} ${selectedApp.applicant?.last_name || ''}`.trim();

    let dateStr = '';
    if (interviewDate && interviewTime) {
      const dt = new Date(`${interviewDate}T${interviewTime}`);
      dateStr = dt.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    const typeLabel = interviewType === 'online' ? 'Online Interview' : 'On-site Interview';
    let notifMsg = `You have been selected for an interview for the ${jobTitle} position.`;
    if (dateStr) notifMsg += ` Scheduled: ${dateStr}.`;
    if (interviewType === 'online' && interviewLink) notifMsg += ` Meeting link: ${interviewLink}`;
    if (interviewType === 'onsite' && interviewLocation) notifMsg += ` Location: ${interviewLocation}`;
    if (interviewNotes) notifMsg += ` Note: ${interviewNotes}`;

    await sendNotification({
      userId: applicantId,
      type: 'interview_scheduled',
      title: `🎉 Interview Scheduled – ${jobTitle}`,
      message: notifMsg,
      link: '/seeker/applications',
    });
  };

  const isCandidateHiredElsewhere = (application: any) =>
    application.status === 'hired' ||
    (application.applicant?.job_seeker_profile?.employment_status === 'hired' &&
      application.applicant?.job_seeker_profile?.hired_application_id !== application.id);

  const isStatusLocked = (app: any) =>
    isCandidateHiredElsewhere(app) || app.status === 'rejected';

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

  // Compute Top 5 applicants across all applications ranked by match_score
  const top5Apps = [...applications]
    .filter((a) => typeof a.match_score === 'number' && a.match_score > 0)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 5);

  return (
    <DashboardLayout
      portal="employer"
      title="Applicants"
      subtitle="View candidate contact details to call or email them directly. Update their application status with a single click."
    >
      <div className="space-y-8 max-w-7xl">

        {/* ── Top 5 Applicants Section ─────────────────────────────────── */}
        {!loading && top5Apps.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Top 5 Applicants by AI Match Score</h2>
                <p className="text-[11px] text-slate-500">Ranked by WorkMatch AI — highest compatibility with your job requirements.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {top5Apps.map((app, idx) => {
                const style = RANK_STYLES[idx];
                const score = Math.round(app.match_score ?? 0);
                const hiredElsewhere = isCandidateHiredElsewhere(app);
                return (
                  <div
                    key={app.id}
                    className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${style.bg} ${hiredElsewhere ? 'opacity-60 grayscale' : 'hover:shadow-sm'}`}
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${style.badge}`}>
                        {style.icon} {style.label}
                      </span>
                      {/* Score Ring */}
                      <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke={score >= 80 ? '#00b074' : score >= 60 ? '#6366f1' : '#f59e0b'}
                            strokeWidth="3"
                            strokeDasharray={`${(score / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800">
                          {score}%
                        </span>
                      </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="flex items-center gap-2.5">
                      {app.applicant?.avatar_url ? (
                        <img
                          src={app.applicant.avatar_url}
                          alt={app.applicant.first_name}
                          className="w-9 h-9 rounded-full object-cover border border-white shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#00b074] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {app.applicant?.first_name?.[0] || 'U'}{app.applicant?.last_name?.[0] || ''}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {app.applicant?.first_name} {app.applicant?.last_name}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {app.job?.title}
                        </p>
                      </div>
                    </div>

                    <Link href={`/employer/applicants/${app.id}`}>
                      <Button variant="outline" size="sm" className="w-full text-[11px] font-bold">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              const phone = app.applicant?.phone;
              const hiredElsewhere = isCandidateHiredElsewhere(app);
              const email = app.applicant?.email;
              const score = typeof app.match_score === 'number' ? Math.round(app.match_score) : null;

              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                    hiredElsewhere
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {/* Not Available Banner */}
                  {hiredElsewhere && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      <span className="text-[11px] font-bold text-rose-700">Not Available — Hired by another company</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {/* Header: Avatar, Name, Job Applied */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {app.applicant?.avatar_url ? (
                          <img
                            src={app.applicant.avatar_url}
                            alt={app.applicant.first_name || 'Applicant'}
                            className={`w-12 h-12 rounded-full object-cover border shadow-xs shrink-0 ${hiredElsewhere ? 'border-slate-200 grayscale' : 'border-emerald-200'}`}
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ${hiredElsewhere ? 'bg-slate-400 text-white' : 'bg-[#00b074] text-white'}`}>
                            {app.applicant?.first_name?.[0] || 'U'}
                            {app.applicant?.last_name?.[0] || ''}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {app.applicant?.first_name} {app.applicant?.last_name}
                          </h4>
                          <p className={`text-xs font-semibold truncate ${hiredElsewhere ? 'text-slate-500' : 'text-emerald-700'}`}>
                            {app.job?.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        {/* Match Score Badge */}
                        {score !== null && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                            score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            score >= 60 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" /> {score}% match
                          </span>
                        )}
                      </div>
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
                          onClick={() => handleDownloadResume(app.resume, app.applicant)}
                          className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Resume
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Status Bar & Details Link */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isStatusLocked(app) ? (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {app.status === 'rejected' ? 'Status locked — Rejected' : 'Status locked'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenMoveModal(app)}
                        className="text-xs font-bold text-slate-700 hover:text-[#00b074] flex items-center gap-1 transition-colors"
                      >
                        Update Status <ChevronDown className="w-3 h-3" />
                      </button>
                    )}

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

      {/* ── Status Change Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedApp) && !showInterviewModal}
        onClose={() => setSelectedApp(null)}
        title="Update Applicant Status"
        description={`Set status for ${selectedApp?.applicant?.first_name} ${selectedApp?.applicant?.last_name}`}
      >
        <form onSubmit={handleConfirmStatusChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Application Status</label>
            <div className="grid grid-cols-2 gap-2">
              {EMPLOYER_ACTION_STATUSES.map((stg) => (
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
            {targetStatus === 'interview' && (
              <p className="text-[11px] text-violet-600 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                You'll be asked to schedule the interview details on the next step.
              </p>
            )}
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
              {targetStatus === 'interview' ? 'Next: Schedule Interview →' : 'Save Status'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Interview Scheduling Modal ───────────────────────────────── */}
      <Modal
        isOpen={showInterviewModal}
        onClose={() => { setShowInterviewModal(false); setSelectedApp(null); }}
        title="Schedule Interview"
        description={`Set interview details for ${selectedApp?.applicant?.first_name} ${selectedApp?.applicant?.last_name}`}
      >
        <form onSubmit={handleConfirmStatusChange} className="space-y-5">
          {/* Interview Type Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Interview Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInterviewType('online')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  interviewType === 'online'
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className="w-4 h-4" /> Online / Virtual
              </button>
              <button
                type="button"
                onClick={() => setInterviewType('onsite')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  interviewType === 'onsite'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" /> On-site / In-person
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />Interview Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-[#00b074] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />Interview Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-[#00b074] focus:outline-none"
              />
            </div>
          </div>

          {/* Online: Meeting Link */}
          {interviewType === 'online' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                <Link2 className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />Meeting Link
              </label>
              <input
                type="url"
                value={interviewLink}
                onChange={(e) => setInterviewLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx or Zoom link"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">e.g. Google Meet, Zoom, MS Teams link. This will be sent to the applicant.</p>
            </div>
          )}

          {/* On-site: Location */}
          {interviewType === 'onsite' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />Interview Location / Address
              </label>
              <input
                type="text"
                value={interviewLocation}
                onChange={(e) => setInterviewLocation(e.target.value)}
                placeholder="e.g., 5th Floor, BDO Tower, Makati City"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:outline-none"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="e.g., Please bring a valid ID and your portfolio..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00b074] focus:outline-none"
            />
          </div>

          {/* Notification Preview */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
              A notification will be sent to {selectedApp?.applicant?.first_name} with the interview details.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowInterviewModal(false); }}
            >
              ← Back
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isUpdating}>
              Confirm & Notify Applicant
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
