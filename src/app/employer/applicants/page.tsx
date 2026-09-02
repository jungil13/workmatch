'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { ApplicationStatus } from '@/types/database';
import {
  Users,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Download,
} from 'lucide-react';

export default function EmployerApplicantsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [targetStage, setTargetStage] = useState<ApplicationStatus>('screening');
  const [stageNotes, setStageNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any = null;
    fetchApplications().then(() => {
      // Subscribe to real-time changes on applications
      channel = supabase
        .channel(`public:applications:employer-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'applications' },
          (payload) => {
            fetchApplications();
          }
        )
        .subscribe();
    });
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function fetchApplications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: ep } = await supabase
      .from('employer_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ep?.company_id) { setLoading(false); return; }

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

  const stages: ApplicationStatus[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

  const filteredApps = applications.filter((app) => {
    if (stageFilter === 'all') return true;
    return app.status === stageFilter;
  });

  const handleOpenMoveModal = (app: any) => {
    setSelectedApp(app);
    setTargetStage(app.status);
    setStageNotes('');
  };

  const handleConfirmStageMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsUpdating(true);

    await supabase
      .from('applications')
      .update({
        status: targetStage,
        recruiter_notes: stageNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedApp.id);

    await supabase.from('audit_logs').insert({
      action: `Recruiter moved candidate application to ${targetStage}`,
      entity_type: 'application',
      entity_id: selectedApp.id,
      metadata: { candidate_name: `${selectedApp.applicant?.first_name} ${selectedApp.applicant?.last_name}`, status: targetStage },
      created_at: new Date().toISOString(),
    });

    setIsUpdating(false);
    setSelectedApp(null);
    fetchApplications();
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Applicant Pipeline"
      subtitle="Screen, evaluate, and progress candidates through your recruitment stages."
    >
      <div className="space-y-6">
        {/* Stage Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              stageFilter === 'all' ? 'bg-dark text-white' : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Candidates ({applications.length})
          </button>
          {stages.map((stg) => {
            const count = applications.filter((a) => a.status === stg).length;
            return (
              <button
                key={stg}
                onClick={() => setStageFilter(stg)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                  stageFilter === stg
                    ? 'bg-mint-500 text-white shadow-sm'
                    : 'bg-white border border-border text-slate-600 hover:bg-slate-50'
                }`}
              >
                {stg} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No applicants found in {stageFilter} stage</h3>
            <p className="text-xs text-muted">Candidates will appear here as they apply to your published job openings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4 flex flex-col justify-between hover:border-mint-200 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {app.applicant?.avatar_url ? (
                        <img
                          src={app.applicant.avatar_url}
                          alt={app.applicant.first_name || 'Applicant'}
                          className="w-12 h-12 rounded-full object-cover border border-mint-200 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mint-500 to-mint-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {app.applicant?.first_name?.[0] || 'U'}{app.applicant?.last_name?.[0] || ''}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-dark">
                          {app.applicant?.first_name} {app.applicant?.last_name}
                        </h4>
                        <p className="text-xs text-mint-700 font-semibold">{app.job?.title}</p>
                        <div className="text-[10px] text-slate-500 mt-1">
                          <p>{app.applicant?.email}</p>
                          {app.applicant?.phone && <p>{app.applicant.phone}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-mint-500" />
                      {app.applicant?.job_seeker_profile?.city || app.job?.city || 'Location unspecified'}
                    </p>
                    <p className="text-[11px] text-muted">
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>

                  {app.resume && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold truncate max-w-[150px] text-slate-700">
                        📄 {app.resume.file_name}
                      </span>
                      <button 
                        onClick={() => handleDownloadResume(app.resume.file_path)}
                        className="text-[10px] text-mint-700 font-bold bg-mint-50 px-2 py-1 rounded-md border border-mint-200 hover:bg-mint-100 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  )}

                  {app.applicant?.skills && app.applicant.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {app.applicant.skills.slice(0, 3).map((sk: any) => (
                        <span
                          key={sk.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-mint-50 text-mint-800 border border-mint-100"
                        >
                          {sk.skill?.name || 'Skill'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 capitalize bg-slate-100 px-2.5 py-1 rounded-lg">
                    {app.status}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="mint-soft"
                      size="sm"
                      onClick={() => handleOpenMoveModal(app)}
                      className="text-xs font-bold"
                    >
                      Move Stage <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Link href={`/employer/applicants/${app.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title="Move Candidate Recruitment Stage"
        description={`Update hiring status for ${selectedApp?.applicant?.first_name} ${selectedApp?.applicant?.last_name}`}
      >
        <form onSubmit={handleConfirmStageMove} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Target Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as any)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark capitalize focus:border-mint-500 focus:outline-none"
            >
              {stages.map((stg) => (
                <option key={stg} value={stg}>
                  {stg.charAt(0).toUpperCase() + stg.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Recruiter Notes (Optional)</label>
            <textarea
              rows={3}
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              placeholder="Add feedback, screening notes, or interview details..."
              className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isUpdating}>
              Update Candidate Stage
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

