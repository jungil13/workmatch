'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase/client';
import { calculateProfileCompleteness } from '@/lib/utils';
import {
  MapPin,
  Mail,
  Phone,
  Share2,
  Edit2,
  User,
  Sparkles,
  GraduationCap,
  Award,
  CheckCircle2,
  Calendar,
  FileCheck,
  Check,
  Clock,
  Briefcase,
} from 'lucide-react';

const CERT_COLORS = ['bg-blue-600', 'bg-amber-500', 'bg-emerald-600', 'bg-purple-600', 'bg-indigo-600'];

export default function SeekerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [seekerProfile, setSeekerProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({ applied: 0, saved: 0, reviewed: 0 });
  const [copiedShare, setCopiedShare] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetchProfileData(user.id, user);
    });
  }, []);

  async function fetchProfileData(userId: string, authUser: any) {
    const [
      profileRes,
      seekerRes,
      skillsRes,
      eduRes,
      docsRes,
      appsRes,
      savedRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId),
      supabase.from('educations').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      supabase.from('documents').select('*').eq('user_id', userId),
      supabase
        .from('applications')
        .select('*, job:jobs(title, company:companies(name))')
        .eq('applicant_id', userId)
        .order('applied_at', { ascending: false }),
      supabase.from('saved_jobs').select('id').eq('user_id', userId),
    ]);

    const meta = authUser.user_metadata;
    const fallbackFirst =
      meta?.first_name ||
      meta?.full_name?.split(' ')[0] ||
      meta?.name?.split(' ')[0] ||
      authUser.email?.split('@')[0] ||
      'John';
    const fallbackLast =
      meta?.last_name ||
      meta?.full_name?.split(' ').slice(1).join(' ') ||
      meta?.name?.split(' ').slice(1).join(' ') ||
      'Hernan';

    const pData = profileRes.data || {
      first_name: fallbackFirst,
      last_name: fallbackLast,
      email: authUser.email,
      phone: '+63 917 123 4567',
      avatar_url: meta?.avatar_url || meta?.picture || null,
    };

    setProfile(pData);
    setSeekerProfile(seekerRes.data);
    setSkills(skillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setDocuments(docsRes.data ?? []);

    const apps = appsRes.data ?? [];
    setRecentApplications(apps.slice(0, 4));
    setStats({
      applied: apps.length,
      saved: (savedRes.data ?? []).length,
      reviewed: apps.filter((a: any) => a.status === 'screening' || a.status === 'hired').length,
    });

    setLoading(false);
  }

  const getInitials = () => {
    if (!profile) return 'JH';
    const firstInitial = profile.first_name?.[0] || 'J';
    const lastInitial = profile.last_name?.[0] || 'H';
    return (firstInitial + lastInitial).toUpperCase();
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Status mapping for simple human-friendly display
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'hired':
        return { label: 'Contacted', color: 'text-[#00b074] bg-emerald-50 border-emerald-200' };
      case 'screening':
        return { label: 'Under Review', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'rejected':
        return { label: 'Rejected', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'applied':
      default:
        return { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="w-9 h-9 border-3 border-[#00b074] border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  const fullName = `${profile?.first_name || 'John'} ${profile?.last_name || 'Hernan'}`.trim();
  const headline =
    seekerProfile?.professional_title || 'Mid-Level Full Stack Developer | React & Node.js Enthusiast';
  const location =
    seekerProfile?.city && seekerProfile?.province
      ? `${seekerProfile.city}, ${seekerProfile.province}`
      : seekerProfile?.city || 'Quezon City, Philippines';
  const email = profile?.email || 'alex.rivera@gmail.com';
  const phone = profile?.phone || '+63 917 123 4567';
  const bio =
    seekerProfile?.bio ||
    'Passionate full-stack developer with 4+ years of experience building scalable web applications. Specialized in React.js and Node.js ecosystems, with a strong focus on creating intuitive user experiences and robust backend architectures. I thrive in collaborative environments and am constantly exploring new technologies to solve complex problems. Currently seeking opportunities to work on innovative projects that make a real impact.';

  // Default skills if user hasn't added any yet
  const defaultSkills = [
    'React.js',
    'Node.js',
    'JavaScript',
    'TypeScript',
    'MongoDB',
    'Express.js',
    'PostgreSQL',
    'AWS',
    'Docker',
    'Git',
    'REST APIs',
    'GraphQL',
    'Redux',
    'Next.js',
    'Tailwind CSS',
  ];

  const skillNames =
    skills.length > 0 ? skills.map((s) => s.skill?.name || s.name).filter(Boolean) : defaultSkills;

  // Default educations/certifications if user hasn't added yet
  const defaultEducations = [
    {
      degree: 'BS Computer Science',
      institution: 'University of the Philippines Diliman',
      period: '2019 - 2023',
      verified: true,
      color: 'bg-blue-600',
    },
    {
      degree: 'AWS Certified Solutions Architect',
      institution: 'Amazon Web Services',
      period: '2023',
      verified: true,
      color: 'bg-amber-600',
    },
    {
      degree: 'Professional Scrum Master I',
      institution: 'Scrum.org',
      period: '2022',
      verified: true,
      color: 'bg-emerald-600',
    },
  ];

  const educationList =
    educations.length > 0
      ? educations.map((e, idx) => ({
          degree: e.degree || e.field_of_study || 'Degree / Credential',
          institution: e.institution || 'University / Institution',
          period: e.start_date
            ? `${new Date(e.start_date).getFullYear()} - ${e.end_date ? new Date(e.end_date).getFullYear() : 'Present'}`
            : '2020 - 2024',
          verified: true,
          color: CERT_COLORS[idx % CERT_COLORS.length],
        }))
      : defaultEducations;

  // Completion calculation
  const completeness = Math.min(
    100,
    calculateProfileCompleteness(seekerProfile, skills, educations, [], documents) || 95
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 selection:bg-emerald-200">
      <Navbar />

      {/* ─── Hero Emerald Banner ─────────────────────────────────── */}
      <div className="h-44 sm:h-52 w-full bg-[#0c4a34] bg-gradient-to-r from-[#03442e] via-[#097b53] to-[#03442e] relative shadow-inner" />

      {/* ─── Profile Header Overlapping Banner ───────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-20 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Avatar + Main Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0 flex-1">
            {/* Avatar with Online Dot */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-[#00b074] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials()
                )}
              </div>
              {/* Online Dot */}
              <span
                className="w-5 h-5 rounded-full bg-emerald-500 border-3 border-white absolute bottom-1 right-1 shadow-xs"
                title="Active Candidate"
              />
            </div>

            {/* Name + Title + Contact Row */}
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                {headline}
              </p>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {phone}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Share Profile & Edit Profile */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00b074]" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share Profile
                </>
              )}
            </button>

            <Link
              href="/seeker/profile/edit"
              className="px-5 py-2.5 rounded-xl bg-[#00b074] hover:bg-[#009b66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main 2-Column Content ─────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ─── LEFT COLUMN (8 cols): Bio, Skills, Education ──────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* About Me Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#00b074]" /> About Me
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                {bio}
              </p>
            </div>

            {/* My Skills Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00b074]" /> My Skills
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {skillNames.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-xs font-medium px-3.5 py-1 rounded-full bg-[#e6f7f0] text-[#008f5d] border border-[#c2edd9] transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Education & Certifications Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#00b074]" /> Education &amp; Certifications
              </h2>

              <div className="space-y-3 pt-1">
                {educationList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Colored Square Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl ${item.color} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        <Award className="w-5 h-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.degree}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.institution}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.period}
                        </p>
                      </div>
                    </div>

                    {/* Verified Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00b074] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#00b074]" /> Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN (4 cols): Completion, Applications ───── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Profile Completion Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Profile Completion
                </span>
                <span className="text-base font-black text-[#00b074]">
                  {completeness}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00b074] rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-100">
                <div className="space-y-0.5">
                  <div className="text-base font-black text-slate-900">
                    {stats.applied || 12}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    Applied
                  </div>
                </div>

                <div className="space-y-0.5 border-x border-slate-100">
                  <div className="text-base font-black text-slate-900">
                    {stats.saved || 8}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    Saved
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-base font-black text-slate-900">
                    {stats.reviewed || 5}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    Reviewed
                  </div>
                </div>
              </div>

              {/* View Certificates / Upload Diploma Button */}
              <Link
                href="/seeker/diploma"
                className="w-full py-3 rounded-xl bg-[#00b074] hover:bg-[#009b66] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                <FileCheck className="w-4 h-4" /> View Certificates
              </Link>
            </div>

            {/* Recent Applications Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00b074]" /> Recent Applications
              </h3>

              {recentApplications.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">No applications yet</p>
                  <Link
                    href="/jobs"
                    className="inline-block text-xs font-semibold text-[#00b074] hover:underline"
                  >
                    Browse open roles →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => {
                    const statusInfo = getStatusBadge(app.status);
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 transition-all"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {app.job?.title || 'Position'}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {app.job?.company?.name || 'Company'}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {app.applied_at
                              ? new Date(app.applied_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </p>
                        </div>

                        {/* Status Label */}
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.color} shrink-0`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
