'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { sendNotification } from '@/lib/notifications';
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Download,
  Phone,
  Mail,
  User,
  Check,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'screening', label: 'Under Review', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'hired', label: 'Contacted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'rejected', label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-200' },
];

export default function EmployerApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let channel: any = null;
    fetchApplication().then(() => {
      channel = supabase
        .channel(`public:applications:${resolvedParams.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'applications', filter: `id=eq.${resolvedParams.id}` },
          () => {
            fetchApplication();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [resolvedParams.id]);

  async function fetchApplication() {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*, company:companies(*)),
        resume:documents(*),
        applicant:profiles(
          id, first_name, last_name, email, phone, avatar_url,
          job_seeker_profile:job_seeker_profiles(*),
          skills:job_seeker_skills(*, skill:skills(*)),
          educations(*),
          work_experiences(*)
        )
      `)
      .eq('id', resolvedParams.id)
      .maybeSingle();

    setApplication(data);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!application) return;
    setIsUpdating(true);

    await supabase
      .from('applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    // Notify candidate
    if (application.applicant_id) {
      const label = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus;
      await sendNotification({
        userId: application.applicant_id,
        type: 'status_update',
        title: 'Application Status Updated',
        message: `Your application for ${application.job?.title || 'the position'} is now marked as "${label}".`,
        link: '/seeker/applications',
      });
    }

    setApplication((prev: any) => ({ ...prev, status: newStatus }));
    setIsUpdating(false);
  };

  if (loading) {
    return (
      <DashboardLayout portal="employer" title="Applicant Details">
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout portal="employer" title="Applicant Details">
        <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
          <h3 className="text-base font-bold text-dark">Applicant Not Found</h3>
          <p className="text-xs text-muted">This application may have been removed or does not exist.</p>
          <Link href="/employer/applicants">
            <Button variant="outline" size="sm" className="mt-4">
              ← Back to Applicants
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const phone = application.applicant?.phone || '+63 917 123 4567';
  const email = application.applicant?.email;
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.value === application.status) || STATUS_OPTIONS[0];

  return (
    <DashboardLayout
      portal="employer"
      title={`${application.applicant?.first_name || 'Candidate'} ${application.applicant?.last_name || ''}`}
      subtitle={`Application for ${application.job?.title || 'Open Position'}`}
      actions={
        <Link href="/employer/applicants">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Applicants
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl items-start">
        {/* Left Column: Candidate Profile & Resume */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Candidate Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {application.applicant?.avatar_url ? (
                  <img
                    src={application.applicant.avatar_url}
                    alt={application.applicant.first_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#00b074] text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
                    {application.applicant?.first_name?.[0] || 'U'}
                    {application.applicant?.last_name?.[0] || ''}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {application.applicant?.first_name} {application.applicant?.last_name}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                    {application.applicant?.job_seeker_profile?.professional_title || 'Job Seeker'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {application.applicant?.job_seeker_profile?.city || 'Location not specified'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Application For
                </span>
                <strong className="text-xs font-bold text-slate-900">{application.job?.title}</strong>
              </div>
            </div>

            {application.applicant?.job_seeker_profile?.bio && (
              <div className="pt-4 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  About Candidate
                </span>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {application.applicant.job_seeker_profile.bio}
                </p>
              </div>
            )}

            {/* Cover Letter if provided */}
            {application.cover_letter && (
              <div className="pt-4 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cover Letter
                </span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70 whitespace-pre-line">
                  {application.cover_letter}
                </p>
              </div>
            )}

            {/* Uploaded Resume Download */}
            {application.resume && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                      {application.resume.file_name}
                    </p>
                    <p className="text-[10px] text-slate-400">Uploaded Candidate Resume</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadResume(application.resume.file_path)}
                  className="font-semibold text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Download Resume
                </Button>
              </div>
            )}
          </div>

          {/* Skills */}
          {application.applicant?.skills && application.applicant.skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00b074]" /> Skills &amp; Proficiencies
              </h4>
              <div className="flex flex-wrap gap-2">
                {application.applicant.skills.map((sk: any) => (
                  <span
                    key={sk.id}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-[#e6f7f0] text-[#008f5d] border border-[#c2edd9]"
                  >
                    {sk.skill?.name || 'Skill'} {sk.proficiency ? `(Lvl ${sk.proficiency}/5)` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {application.applicant?.educations && application.applicant.educations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#00b074]" /> Education Records
              </h4>
              <div className="space-y-2">
                {application.applicant.educations.map((edu: any) => (
                  <div key={edu.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-900">
                      {edu.degree} in {edu.field_of_study}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {edu.school_name || edu.institution} ({edu.start_year || '2020'} - {edu.end_year || 'Present'})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Contact Candidate & Status Management */}
        <div className="lg:col-span-4 space-y-6">
          {/* Direct Contact Box (Phone & Email) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contact Candidate Directly
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Reach out directly to schedule a discussion or interview via their provided contact details:
            </p>

            <div className="space-y-2.5 pt-1">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="w-full py-3 px-4 rounded-xl bg-[#00b074] hover:bg-[#009b66] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4" /> Call: {phone}
                </a>
              )}

              {email && (
                <a
                  href={`mailto:${email}?subject=Application for ${encodeURIComponent(application.job?.title || 'Job Opening')}`}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors truncate"
                >
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">Email Candidate</span>
                </a>
              )}
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Application Status
              </h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentStatusObj.color}`}>
                {currentStatusObj.label}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Click below to immediately update the status visible to the candidate:
            </p>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((stg) => {
                const isActive = application.status === stg.value;
                return (
                  <button
                    key={stg.value}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(stg.value)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                      isActive
                        ? 'bg-[#00b074] text-white border-[#00b074] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{stg.label}</span>
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
