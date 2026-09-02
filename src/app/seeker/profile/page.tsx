'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  ShieldCheck,
  Edit2,
  Phone,
  Mail,
  DollarSign,
  Clock,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { formatSalaryRange } from '@/lib/utils';

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
      fetchData(user.id, user);
    });
  }, []);

  async function fetchData(userId: string, authUser: any) {
    const [profileRes, seekerRes, skillsRes, eduRes, expRes, docsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId),
      supabase.from('educations').select('*').eq('user_id', userId),
      supabase.from('work_experiences').select('*').eq('user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId),
    ]);

    const meta = authUser.user_metadata;
    const fallbackFirst =
      meta?.first_name ||
      meta?.full_name?.split(' ')[0] ||
      meta?.name?.split(' ')[0] ||
      authUser.email?.split('@')[0] ||
      'User';
    const fallbackLast =
      meta?.last_name ||
      meta?.full_name?.split(' ').slice(1).join(' ') ||
      meta?.name?.split(' ').slice(1).join(' ') ||
      '';
    const fallbackAvatar = meta?.avatar_url || meta?.picture || null;

    setProfile(
      profileRes.data || {
        first_name: fallbackFirst,
        last_name: fallbackLast,
        email: authUser.email,
        avatar_url: fallbackAvatar,
      }
    );
    setSeekerProfile(seekerRes.data);
    setSkills(skillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setExperiences(expRes.data ?? []);
    setDocuments(docsRes.data ?? []);
    setLoading(false);
  }

  const isDiplomaVerified = documents.some(
    (d) => d.document_type === 'diploma' && d.verification_status === 'verified'
  );

  const getInitials = () => {
    if (!profile) return 'U';
    const firstInitial = profile.first_name?.[0] || '';
    const lastInitial = profile.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

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
      subtitle="Your verified professional profile visible to employers."
      actions={
        <Link href="/seeker/profile/edit">
          <Button variant="primary" size="sm" className="shadow-sm">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        </Link>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Bio / Main Header Card */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-mint-200 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-mint-500 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                  {getInitials()}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-dark">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  {isDiplomaVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-mint-800 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-mint-600" /> Verified Credential
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-mint-700">
                  {seekerProfile?.professional_title || 'Software & Tech Professional'}
                </p>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted pt-1">
                  {(seekerProfile?.city || seekerProfile?.province) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-mint-500" />
                      {seekerProfile.city}
                      {seekerProfile.province ? `, ${seekerProfile.province}` : ''}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {profile.email}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link href="/seeker/profile/edit" className="self-end sm:self-start">
              <Button variant="outline" size="sm">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            </Link>
          </div>

          {/* Bio text */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-bold text-dark uppercase tracking-wider mb-2">About Me</h4>
            {seekerProfile?.bio ? (
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                {seekerProfile.bio}
              </p>
            ) : (
              <p className="text-xs text-muted italic bg-slate-50/50 p-4 rounded-2xl">
                No bio provided yet. Click "Edit Profile" to introduce yourself to employers.
              </p>
            )}
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-muted uppercase font-bold">Availability</span>
              <p className="text-xs font-bold text-dark mt-0.5">
                {seekerProfile?.availability || 'Immediate'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-muted uppercase font-bold">Work Arrangement</span>
              <p className="text-xs font-bold text-dark mt-0.5">
                {seekerProfile?.preferred_work_arrangement || 'Hybrid'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-muted uppercase font-bold">Experience</span>
              <p className="text-xs font-bold text-dark mt-0.5">
                {seekerProfile?.years_experience || 0} Years
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-muted uppercase font-bold">Salary Expectation</span>
              <p className="text-xs font-bold text-mint-800 mt-0.5">
                {seekerProfile?.preferred_salary_min
                  ? `₱${Number(seekerProfile.preferred_salary_min).toLocaleString()} /mo`
                  : 'Open'}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <Star className="w-4 h-4 text-mint-600" /> Core Skills ({skills.length})
            </h3>
            <Link href="/seeker/profile/edit">
              <Button variant="ghost" size="sm" className="text-xs text-mint-700">
                + Manage Skills
              </Button>
            </Link>
          </div>

          {skills.length === 0 ? (
            <div className="text-center py-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-muted">No skills added yet.</p>
              <Link href="/seeker/profile/edit">
                <Button variant="mint-soft" size="sm">Add Your Skills</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((sk: any) => (
                <span
                  key={sk.id}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-mint-50 border border-mint-200 text-mint-950 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-mint-600" />
                  {sk.skill?.name || 'Skill'} — Level {sk.proficiency}/5
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-mint-600" /> Work Experience ({experiences.length})
            </h3>
            <Link href="/seeker/profile/edit">
              <Button variant="ghost" size="sm" className="text-xs text-mint-700">
                + Add Experience
              </Button>
            </Link>
          </div>

          {experiences.length === 0 ? (
            <div className="text-center py-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-muted">No work experience records listed.</p>
              <Link href="/seeker/profile/edit">
                <Button variant="mint-soft" size="sm">Add Experience</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp: any) => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-dark">{exp.job_title}</h4>
                    <span className="text-[11px] text-muted">
                      {exp.start_date} — {exp.is_current ? 'Present' : exp.end_date || 'Present'}
                    </span>
                  </div>
                  <p className="text-xs text-mint-700 font-semibold">{exp.company_name}</p>
                  {exp.description && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-mint-600" /> Education ({educations.length})
            </h3>
            <Link href="/seeker/profile/edit">
              <Button variant="ghost" size="sm" className="text-xs text-mint-700">
                + Add Education
              </Button>
            </Link>
          </div>

          {educations.length === 0 ? (
            <div className="text-center py-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-muted">No education records listed.</p>
              <Link href="/seeker/profile/edit">
                <Button variant="mint-soft" size="sm">Add Education</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {educations.map((edu: any) => (
                <div key={edu.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <h4 className="text-sm font-bold text-dark">
                    {edu.degree} in {edu.field_of_study}
                  </h4>
                  <p className="text-xs text-mint-700 font-semibold">{edu.school_name}</p>
                  <p className="text-[11px] text-muted">
                    {edu.start_year || edu.start_date || 'Attended'} — {edu.end_year || edu.end_date || 'Graduated'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
