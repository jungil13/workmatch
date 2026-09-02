'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { ApplicationStatus } from '@/types/database';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Download,
} from 'lucide-react';

export default function EmployerApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  useEffect(() => {
    let channel: any = null;
    fetchApplication().then(() => {
      // Subscribe to real-time changes for this specific application
      channel = supabase
        .channel(`public:applications:${resolvedParams.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'applications', filter: `id=eq.${resolvedParams.id}` },
          (payload) => {
            fetchApplication();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [resolvedParams.id]);

  async function fetchApplication() {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*, company:companies(*)),
        interview:interviews(*),
        resume:documents(*),
        applicant:profiles(
          id, first_name, last_name, email, phone,
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

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    const parsedDate = new Date(interviewDate);
    if (isNaN(parsedDate.getTime())) {
      alert("Please select a valid date and time.");
      return;
    }

    await supabase.from('interviews').insert({
      application_id: application.id,
      status: 'scheduled',
      scheduled_at: parsedDate.toISOString(),
      duration_minutes: Number(durationMinutes),
      meeting_url: meetingUrl,
      notes: interviewNotes,
      location: 'Online Meeting',
    });

    await supabase
      .from('applications')
      .update({ status: 'interview', updated_at: new Date().toISOString() })
      .eq('id', application.id);

    setScheduledSuccess(true);
    setTimeout(() => {
      setIsInterviewModalOpen(false);
      setScheduledSuccess(false);
      fetchApplication();
    }, 1200);
  };

  const handleStageChange = async (newStage: ApplicationStatus) => {
    if (!application) return;
    await supabase
      .from('applications')
      .update({ status: newStage, updated_at: new Date().toISOString() })
      .eq('id', application.id);
    fetchApplication();
  };

  if (loading) {
    return (
      <DashboardLayout portal="employer" title="Candidate Evaluation">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout portal="employer" title="Applicant Not Found">
        <div className="p-8 text-center space-y-4">
          <p className="text-xs text-muted">The requested applicant record could not be found.</p>
          <Link href="/employer/applicants">
            <Button variant="primary" size="sm">Back to Pipeline</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      portal="employer"
      title="Candidate Evaluation"
      subtitle={`Reviewing candidate profile for ${application.applicant?.first_name} ${application.applicant?.last_name}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="mint-soft"
            size="sm"
            onClick={() => setIsInterviewModalOpen(true)}
            className="font-bold"
          >
            <Calendar className="w-4 h-4" /> Schedule Interview
          </Button>
          <Link href="/employer/applicants">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" /> All Applicants
            </Button>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl">
        <div className="lg:col-span-8 space-y-6">
          {/* Candidate Bio Header */}
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-mint-500 to-mint-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {application.applicant?.first_name?.[0] || 'U'}{application.applicant?.last_name?.[0] || ''}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark">
                    {application.applicant?.first_name} {application.applicant?.last_name}
                  </h2>
                  <p className="text-xs font-semibold text-mint-700 mt-0.5">
                    {application.applicant?.job_seeker_profile?.professional_title || 'Candidate'}
                  </p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-mint-500" />
                    {application.applicant?.job_seeker_profile?.city || 'Location not provided'}
                  </p>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-3">
                    <p>{application.applicant?.email}</p>
                    {application.applicant?.phone && <p>• {application.applicant.phone}</p>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center shrink-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Application For</span>
                <strong className="text-sm font-bold text-dark">{application.job?.title}</strong>
              </div>
            </div>

            {application.applicant?.job_seeker_profile?.bio && (
              <p className="text-xs text-slate-700 leading-relaxed pt-3 border-t border-border">
                {application.applicant.job_seeker_profile.bio}
              </p>
            )}

            {application.resume && (
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="text-sm font-bold text-dark truncate max-w-[200px] sm:max-w-[300px]">{application.resume.file_name}</p>
                    <p className="text-[10px] text-muted">Uploaded Resume</p>
                  </div>
                </div>
                <Button variant="mint-soft" size="sm" onClick={() => handleDownloadResume(application.resume.file_path)} className="font-bold">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-mint-600" /> Skills & Proficiencies
            </h3>
            {application.applicant?.skills?.length === 0 ? (
              <p className="text-xs text-muted">No skills listed on profile.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {application.applicant?.skills?.map((sk: any) => (
                  <div key={sk.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-dark">{sk.skill?.name || 'Skill'}</span>
                    <span className="text-[10px] text-mint-700 font-bold bg-mint-50 px-2 py-0.5 rounded-md">
                      Lvl {sk.proficiency}/5
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-mint-600" /> Education & Degrees
            </h3>
            {application.applicant?.educations?.length === 0 ? (
              <p className="text-xs text-muted">No education records provided.</p>
            ) : (
              <div className="space-y-2">
                {application.applicant?.educations?.map((edu: any) => (
                  <div key={edu.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-dark">{edu.degree} in {edu.field_of_study}</h4>
                    <p className="text-[11px] text-mint-700">{edu.school_name} ({edu.start_year} - {edu.end_year || 'Present'})</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Stage and Interview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-dark">Stage Management</h3>
            <div className="space-y-2">
              {(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as ApplicationStatus[]).map((stg) => (
                <button
                  key={stg}
                  onClick={() => handleStageChange(stg)}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold capitalize transition-all flex items-center justify-between border ${
                    application.status === stg
                      ? 'bg-mint-500 text-white border-mint-500 shadow-sm'
                      : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{stg} Stage</span>
                  {application.status === stg && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {application.interview && (Array.isArray(application.interview) ? application.interview.length > 0 : true) && (
            (() => {
              const interview = Array.isArray(application.interview) ? application.interview[0] : application.interview;
              return (
                <div className="bg-mint-50 border border-mint-200 rounded-3xl p-6 shadow-soft space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-mint-900">
                    <Calendar className="w-4 h-4 text-mint-600" /> Scheduled Interview
                  </div>
                  <p className="font-bold text-dark">
                    {new Date(interview.scheduled_at).toLocaleString()}
                  </p>
                  {interview.meeting_url && (
                    <a
                      href={interview.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-mint-700 font-bold underline"
                    >
                      Join Meeting URL →
                    </a>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      <Modal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        title="Schedule Interview"
        description={`Set up a screening or interview with ${application.applicant?.first_name}`}
      >
        {scheduledSuccess ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-mint-600 mx-auto" />
            <h3 className="text-base font-bold text-dark">Interview Scheduled!</h3>
            <p className="text-xs text-muted">Interview recorded and application stage moved.</p>
          </div>
        ) : (
          <form onSubmit={handleScheduleInterview} className="space-y-4">
            <Input
              label="Date & Time *"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
              </select>
            </div>

            <Input
              label="Meeting URL (Google Meet / Zoom / MS Teams)"
              placeholder="https://meet.google.com/..."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Notes</label>
              <textarea
                rows={3}
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Technical discussion, panel interview, or background screen..."
                className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsInterviewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Confirm & Save Interview
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}
