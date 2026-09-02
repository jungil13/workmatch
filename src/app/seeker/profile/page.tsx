'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { User, MapPin, Briefcase, GraduationCap, Star, ShieldCheck, Edit2 } from 'lucide-react';

export default function SeekerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [seekerProfile, setSeekerProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetchData(user.id);
    });
  }, []);

  async function fetchData(userId: string) {
    const [profileRes, seekerRes, skillsRes, eduRes, expRes, docsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId),
      supabase.from('educations').select('*').eq('user_id', userId).order('end_year', { ascending: false }),
      supabase.from('work_experiences').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      supabase.from('documents').select('*').eq('user_id', userId),
    ]);
    setProfile(profileRes.data);
    setSeekerProfile(seekerRes.data);
    setSkills(skillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setExperiences(expRes.data ?? []);
    setDocuments(docsRes.data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <DashboardLayout portal="seeker" title="My Profile">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      portal="seeker"
      title="My Profile"
      subtitle="Your professional profile visible to employers."
      actions={
        <Link href="/seeker/profile/edit">
          <Button variant="primary" size="sm">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Bio Card */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-mint-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark">{profile?.first_name} {profile?.last_name}</h2>
              <p className="text-xs font-semibold text-mint-700">{seekerProfile?.professional_title || 'No title set'}</p>
              {seekerProfile?.city && (
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-mint-500" />
                  {seekerProfile.city}, {seekerProfile.province}
                </p>
              )}
            </div>
          </div>
          {seekerProfile?.bio ? (
            <p className="text-xs text-slate-700 leading-relaxed">{seekerProfile.bio}</p>
          ) : (
            <p className="text-xs text-muted italic">No bio added yet.</p>
          )}
        </div>

        {/* Skills */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            <Star className="w-4 h-4 text-mint-600" /> Skills
          </h3>
          {skills.length === 0 ? (
            <p className="text-xs text-muted">No skills added yet. <Link href="/seeker/profile/edit" className="text-mint-600 underline">Add skills â†’</Link></p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((sk: any) => (
                <span key={sk.id} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-dark">
                  {sk.skill?.name} â€” Lvl {sk.proficiency}/5
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-mint-600" /> Education
          </h3>
          {educations.length === 0 ? (
            <p className="text-xs text-muted">No education records. <Link href="/seeker/profile/edit" className="text-mint-600 underline">Add education â†’</Link></p>
          ) : (
            <div className="space-y-3">
              {educations.map((edu: any) => (
                <div key={edu.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-dark">{edu.degree} in {edu.field_of_study}</h4>
                  <p className="text-xs text-mint-700 font-semibold">{edu.school_name}</p>
                  <p className="text-xs text-muted">{edu.start_year} â€“ {edu.end_year || 'Present'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-mint-600" /> Work Experience
          </h3>
          {experiences.length === 0 ? (
            <p className="text-xs text-muted">No experience added yet. <Link href="/seeker/profile/edit" className="text-mint-600 underline">Add experience â†’</Link></p>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp: any) => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-dark">{exp.job_title}</h4>
                  <p className="text-xs text-mint-700 font-semibold">{exp.company_name}</p>
                  <p className="text-xs text-muted">{exp.start_date} â€“ {exp.end_date || 'Present'}</p>
                  {exp.description && <p className="text-xs text-slate-600 mt-1">{exp.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

