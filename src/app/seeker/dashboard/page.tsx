'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { supabase } from '@/lib/supabase/client';
import {
  Briefcase, FileText, Star, Sparkles, ArrowRight,
  UserCheck, Clock, CheckCircle2, PlusCircle,
} from 'lucide-react';

export default function SeekerDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [seekerProfile, setSeekerProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId),
      supabase.from('educations').select('*').eq('user_id', userId),
      supabase.from('work_experiences').select('*').eq('user_id', userId),
      supabase.from('applications').select('*, job:jobs(*, company:companies(*))').eq('applicant_id', userId).order('applied_at', { ascending: false }).limit(5),
    ]);

    setProfile(profileRes.data);
    setSeekerProfile(seekerRes.data);
    setSkills(skillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setExperiences(expRes.data ?? []);
    setApplications(appsRes.data ?? []);
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
      title={`Welcome back, ${profile?.first_name || 'there'} ðŸ‘‹`}
      subtitle="Track your job search progress and explore new AI-matched opportunities."
      actions={
        <Link href="/seeker/find-jobs">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Sparkles className="w-4 h-4" /> Find Matching Jobs
          </Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Profile Completeness */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-dark">Profile Completeness</h3>
            <span className="text-2xl font-black text-mint-600">{completeness}%</span>
          </div>
          <Progress value={completeness} size="lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className={`p-3 rounded-xl border text-center ${seekerProfile?.professional_title ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${seekerProfile?.professional_title ? 'text-mint-600' : 'text-slate-300'}`} />
              Professional Title
            </div>
            <div className={`p-3 rounded-xl border text-center ${skills.length >= 3 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${skills.length >= 3 ? 'text-mint-600' : 'text-slate-300'}`} />
              Skills ({skills.length})
            </div>
            <div className={`p-3 rounded-xl border text-center ${educations.length > 0 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${educations.length > 0 ? 'text-mint-600' : 'text-slate-300'}`} />
              Education
            </div>
            <div className={`p-3 rounded-xl border text-center ${experiences.length > 0 ? 'bg-mint-50 border-mint-200 text-mint-800' : 'bg-slate-50 border-slate-100 text-muted'}`}>
              <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${experiences.length > 0 ? 'text-mint-600' : 'text-slate-300'}`} />
              Experience
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
                    <p className="text-xs text-muted">{app.job?.company?.name} • {app.job?.city}</p>
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
    </DashboardLayout>
  );
}

