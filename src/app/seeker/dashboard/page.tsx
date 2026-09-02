'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { calculateJobMatch } from '@/lib/matching/matchingEngine';
import { formatSalaryRange } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import {
  Briefcase,
  FileText,
  Star,
  Sparkles,
  ArrowRight,
  UserCheck,
  Clock,
  CheckCircle2,
  PlusCircle,
  Eye,
  MapPin,
  Building2,
  TrendingUp,
} from 'lucide-react';

export default function SeekerDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [seekerProfile, setSeekerProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [topRecommendations, setTopRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);
      fetchData(user.id);
    });
  }, []);

  async function fetchData(userId: string) {
    const [
      profileRes,
      seekerRes,
      skillsRes,
      eduRes,
      expRes,
      appsRes,
      jobsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId),
      supabase.from('educations').select('*').eq('user_id', userId),
      supabase.from('work_experiences').select('*').eq('user_id', userId),
      supabase.from('applications').select('*, job:jobs(*, company:companies(*))').eq('applicant_id', userId).order('applied_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))').eq('status', 'published').limit(10),
    ]);

    setProfile(profileRes.data);
    setSeekerProfile(seekerRes.data);
    setSkills(skillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setExperiences(expRes.data ?? []);
    setApplications(appsRes.data ?? []);

    const candidateData = {
      profile: seekerRes.data || {},
      skills: skillsRes.data || [],
      educations: eduRes.data || [],
    };

    const rawJobs = jobsRes.data ?? [];
    const scored = rawJobs.map((j: any) => ({
      ...j,
      match: calculateJobMatch(j, candidateData as any),
    }));

    scored.sort((a, b) => b.match.overallScore - a.match.overallScore);
    setTopRecommendations(scored.slice(0, 3));
    setLoading(false);
  }

  // Calculate profile completeness
  const completeness = (() => {
    let score = 20;
    if (seekerProfile?.professional_title) score += 10;
    if (seekerProfile?.bio) score += 10;
    if (skills.length >= 3) score += 15;
    if (educations.length > 0) score += 15;
    if (experiences.length > 0) score += 15;
    if (seekerProfile?.preferred_salary_min || seekerProfile?.preferred_job_type) score += 5;
    if (seekerProfile?.city) score += 10;
    return Math.min(100, score);
  })();

  if (loading) {
    return (
      <DashboardLayout portal="seeker" title="Dashboard">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      portal="seeker"
      title={`Welcome back, ${profile?.first_name || 'there'} 👋`}
      subtitle="Track your applications progress and explore your top AI career recommendations."
      actions={
        <Link href="/seeker/scanner">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Sparkles className="w-4 h-4" /> AI Recommendations Hub
          </Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Profile Completeness Card */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-dark">Profile Match Completeness</h3>
            <span className="text-2xl font-black text-mint-600">{completeness}%</span>
          </div>
          <Progress value={completeness} size="lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className={`p-3 rounded-xl border text-center ${seekerProfile?.professional_title ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${seekerProfile?.professional_title ? 'text-mint-600' : 'text-slate-300'}`} />
              Title & Bio
            </div>
            <div className={`p-3 rounded-xl border text-center ${skills.length >= 3 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${skills.length >= 3 ? 'text-mint-600' : 'text-slate-300'}`} />
              Skills ({skills.length})
            </div>
            <div className={`p-3 rounded-xl border text-center ${educations.length > 0 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${educations.length > 0 ? 'text-mint-600' : 'text-slate-300'}`} />
              Education ({educations.length})
            </div>
            <div className={`p-3 rounded-xl border text-center ${experiences.length > 0 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${experiences.length > 0 ? 'text-mint-600' : 'text-slate-300'}`} />
              Experience ({experiences.length})
            </div>
          </div>
          {completeness < 100 && (
            <Link href="/seeker/profile/edit">
              <Button variant="mint-soft" size="sm" className="mt-2">
                Complete Your Profile <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Top AI Job Recommendations Section */}
        {topRecommendations.length > 0 && (
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-dark flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-mint-600" /> Top AI Job Matches for You
                </h3>
                <p className="text-xs text-muted">Recommended based on your current skills and location.</p>
              </div>
              <Link href="/seeker/scanner">
                <Button variant="outline" size="sm">View All Matches <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topRecommendations.map((job) => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl border border-border bg-slate-50/50 hover:bg-white hover:border-mint-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                        {job.employment_type}
                      </span>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {job.match.overallScore}% Match
                      </span>
                    </div>

                    <h4
                      onClick={() => setSelectedJobForDetails(job)}
                      className="text-sm font-bold text-dark hover:text-mint-600 cursor-pointer line-clamp-1"
                    >
                      {job.title}
                    </h4>

                    <p className="text-xs text-muted font-medium truncate">
                      {job.company?.name} • {job.city || 'Remote'}
                    </p>

                    <p className="text-xs font-black text-dark">
                      {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobForDetails(job)}
                      className="text-xs flex-1 justify-center"
                    >
                      Details
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedJobForApply(job)}
                      className="text-xs font-bold flex-1 justify-center shadow-xs"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Applications */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-base font-bold text-dark">Recent Applications</h3>
            <Link href="/seeker/applications">
              <Button variant="outline" size="sm">View All <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-muted">You haven't applied to any jobs yet.</p>
              <Link href="/seeker/find-jobs">
                <Button variant="primary" size="sm">
                  <Sparkles className="w-4 h-4" /> Explore Jobs
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any, idx: number) => (
                <div key={app.id || idx} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-dark">{app.job?.title}</h4>
                    <p className="text-xs text-muted">{app.job?.company?.name} • {app.job?.city || 'Remote'}</p>
                  </div>
                  <span className="text-xs font-bold capitalize text-mint-800 bg-mint-50 px-2.5 py-1 rounded-full border border-mint-200 shrink-0">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isOpen={!!selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onApplyClick={(jobToApply) => {
            setSelectedJobForDetails(null);
            setSelectedJobForApply(jobToApply);
          }}
        />
      )}

      {/* Apply Modal */}
      {selectedJobForApply && (
        <ApplyModal
          job={selectedJobForApply}
          isOpen={!!selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          matchScore={selectedJobForApply.match?.overallScore || 0}
          onSuccess={() => {
            if (user) fetchData(user.id);
          }}
        />
      )}
    </DashboardLayout>
  );
}
