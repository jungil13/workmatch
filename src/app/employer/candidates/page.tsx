'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  Send,
  Users,
} from 'lucide-react';

export default function EmployerCandidateMatcherPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<any | null>(null);
  const [invited, setInvited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: ep } = await supabase.from('employer_profiles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (!ep?.company_id) { setLoading(false); return; }

      const { data: jobsList } = await supabase
        .from('jobs')
        .select('*, required_skills:job_skills(*, skill:skills(*))')
        .eq('company_id', ep.company_id)
        .eq('status', 'published');

      setJobs(jobsList ?? []);
      if (jobsList && jobsList.length > 0) {
        setSelectedJobId(jobsList[0].id);
      }

      // Fetch all seekers with their skills
      const { data: seekerProfiles } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email, phone,
          job_seeker_profile:job_seeker_profiles(*),
          skills:job_seeker_skills(*, skill:skills(*)),
          educations(*),
          work_experiences(*)
        `)
        .eq('role', 'job_seeker');

      setCandidates(seekerProfiles ?? []);
      if (seekerProfiles && seekerProfiles.length > 0) {
        setActiveCandidate(seekerProfiles[0]);
      }
      setLoading(false);
    });
  }, []);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const handleInvite = async () => {
    if (!activeCandidate || !selectedJob) return;
    setInvited(true);

    await supabase.from('notifications').insert({
      user_id: activeCandidate.id,
      title: 'Job Opportunity Invitation',
      message: `An employer invited you to apply for ${selectedJob.title}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    setTimeout(() => setInvited(false), 2000);
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Candidate Match Finder"
      subtitle="Discover registered talent in the platform matching your job criteria."
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-dark">No active jobs to match</h3>
          <p className="text-xs text-muted">Create and publish a job posting to match candidates against your requirements.</p>
          <Link href="/employer/jobs/create">
            <Button variant="primary" size="sm">Post a Job</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl">
          {/* Left: Job selector & candidate list */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Target Job Opening</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs font-bold text-dark focus:border-mint-500 focus:outline-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.city || 'Remote'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedJob && (
                <div className="space-y-2 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Work Arrangement</span>
                    <span className="font-bold text-dark">{selectedJob.work_arrangement}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Experience Level</span>
                    <span className="font-bold text-dark">{selectedJob.experience_level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Location</span>
                    <span className="font-bold text-dark">{selectedJob.city || 'Remote'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Candidates */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Available Candidates ({candidates.length})
              </h3>
              {candidates.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No job seekers registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {candidates.map((cand) => {
                    const isSelected = activeCandidate?.id === cand.id;
                    return (
                      <div
                        key={cand.id}
                        onClick={() => setActiveCandidate(cand)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-mint-50/80 border-mint-400 shadow-sm'
                            : 'bg-slate-50 border-slate-100 hover:border-mint-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-mint-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {cand.first_name?.[0] || 'U'}{cand.last_name?.[0] || ''}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-dark">{cand.first_name} {cand.last_name}</h4>
                            <p className="text-[10px] text-muted">
                              {cand.job_seeker_profile?.professional_title || 'Job Seeker'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Candidate view */}
          {activeCandidate ? (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-mint-500 to-mint-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {activeCandidate.first_name?.[0] || 'U'}{activeCandidate.last_name?.[0] || ''}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-dark">{activeCandidate.first_name} {activeCandidate.last_name}</h2>
                    <p className="text-xs font-semibold text-mint-700">
                      {activeCandidate.job_seeker_profile?.professional_title || 'Job Seeker'}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-mint-500" /> {activeCandidate.job_seeker_profile?.city || 'Location not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {activeCandidate.job_seeker_profile?.bio && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Bio</h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {activeCandidate.job_seeker_profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skills</h4>
                {activeCandidate.skills?.length === 0 ? (
                  <p className="text-xs text-muted">No skills listed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeCandidate.skills?.map((sk: any) => (
                      <span
                        key={sk.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 text-dark border border-slate-200"
                      >
                        {sk.skill?.name || 'Skill'} (Lvl {sk.proficiency}/5)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
                <span className="text-xs text-muted font-medium">
                  Availability: {activeCandidate.job_seeker_profile?.availability || 'Available'}
                </span>
                <div>
                  {invited ? (
                    <span className="text-xs font-bold text-mint-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Invitation Sent!
                    </span>
                  ) : (
                    <Button variant="primary" size="md" onClick={handleInvite} className="shadow-md font-bold">
                      <Send className="w-3.5 h-3.5" /> Send Job Invitation
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-border p-12 text-center text-xs text-muted">
              Select a candidate from the left list to review their qualifications.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

