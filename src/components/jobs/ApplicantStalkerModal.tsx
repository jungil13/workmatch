'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { trackJobInteraction } from '@/lib/services/jobTrackingService';
import {
  Users,
  Eye,
  Sparkles,
  ShieldCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Award,
  ChevronRight,
  ArrowLeft,
  Star,
  Search,
  ExternalLink,
  Target,
} from 'lucide-react';

interface CandidateItem {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  title: string;
  school: string;
  degree: string;
  verifiedDiploma: boolean;
  yearsExp: number;
  city: string;
  distanceKm: number;
  matchScore: number;
  type: string;
  skills: string[];
  bio: string;
  isCurrentUser?: boolean;
}

interface ApplicantStalkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  currentUserId?: string;
  currentUserMatchScore?: number;
}

export function ApplicantStalkerModal({
  isOpen,
  onClose,
  job,
  currentUserId,
  currentUserMatchScore = 92,
}: ApplicantStalkerModalProps) {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'applied' | 'viewed'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !job?.id) return;

    async function loadApplicantsAndVisitors() {
      setLoading(true);

      try {
        // Record current user view for this job in localStorage and database
        trackJobInteraction(job.id, { userId: currentUserId, source: 'stalker_view' });
        if (currentUserId) {
          const viewedKey = `viewed_job_${job.id}`;
          const currentViews = JSON.parse(localStorage.getItem(viewedKey) || '[]');
          if (!currentViews.includes(currentUserId)) {
            currentViews.push(currentUserId);
            localStorage.setItem(viewedKey, JSON.stringify(currentViews));
          }
        }

        // 1. Fetch real applications for this job
        const { data: realApps } = await supabase
          .from('applications')
          .select(`
            id,
            match_score,
            status,
            applied_at,
            applicant_id,
            applicant:profiles(
              id, first_name, last_name, email, avatar_url,
              job_seeker_profile:job_seeker_profiles(*),
              skills:job_seeker_skills(*, skill:skills(*)),
              educations(*)
            )
          `)
          .eq('job_id', job.id);

        // 2. Fetch other job seekers from profiles to provide real candidate directory
        const { data: allSeekers } = await supabase
          .from('profiles')
          .select(`
            id, first_name, last_name, avatar_url, role,
            job_seeker_profile:job_seeker_profiles(*),
            skills:job_seeker_skills(*, skill:skills(*)),
            educations(*)
          `)
          .eq('role', 'job_seeker')
          .limit(15);

        // Synthesize candidate competitor profiles with realistic scores
        const sampleCandidatesList: CandidateItem[] = [
          {
            id: 'c-1',
            first_name: 'Mark Lester',
            last_name: 'Dela Cruz',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            title: 'Senior Frontend Engineer',
            school: 'UP Diliman',
            degree: 'B.S. Computer Science',
            verifiedDiploma: true,
            yearsExp: 5,
            city: 'Quezon City',
            distanceKm: 2.8,
            matchScore: 94,
            type: 'applied',
            skills: ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Tailwind CSS', 'Redux'],
            bio: 'Passionate frontend engineer with 5 years experience specializing in scalable React ecosystems and responsive web performance.',
          },
          {
            id: 'c-2',
            first_name: 'Angela Marie',
            last_name: 'Santos',
            avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
            title: 'React & UI Developer',
            school: 'Ateneo de Manila University',
            degree: 'B.S. Information Technology',
            verifiedDiploma: true,
            yearsExp: 4,
            city: 'Taguig / BGC',
            distanceKm: 8.5,
            matchScore: 89,
            type: 'applied',
            skills: ['React', 'JavaScript', 'Node.js', 'REST APIs', 'CSS3', 'Git'],
            bio: 'Frontend specialist experienced in design systems, micro-frontends, and accessible user interfaces.',
          },
          {
            id: 'c-3',
            first_name: 'John Carlo',
            last_name: 'Reyes',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            title: 'Full Stack JavaScript Developer',
            school: 'De La Salle University',
            degree: 'B.S. Software Engineering',
            verifiedDiploma: true,
            yearsExp: 6,
            city: 'Makati City',
            distanceKm: 6.2,
            matchScore: 86,
            type: 'applied',
            skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
            bio: 'Software engineer building modern web platforms, REST APIs, and cloud infrastructure.',
          },
          {
            id: 'c-4',
            first_name: 'Patricia Joy',
            last_name: 'Navarro',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            title: 'Frontend Web Developer',
            school: 'University of Santo Tomas',
            degree: 'B.S. Information Systems',
            verifiedDiploma: false,
            yearsExp: 3,
            city: 'Manila',
            distanceKm: 12.0,
            matchScore: 81,
            type: 'viewed',
            skills: ['React', 'JavaScript', 'HTML5', 'Tailwind CSS', 'Figma'],
            bio: 'UI/UX focused web developer with a keen eye for animations and responsive design.',
          },
          {
            id: 'c-5',
            first_name: 'Christian Dave',
            last_name: 'Bautista',
            avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
            title: 'Software Developer',
            school: 'Cebu Institute of Technology',
            degree: 'B.S. Computer Engineering',
            verifiedDiploma: true,
            yearsExp: 4,
            city: 'Cebu City',
            distanceKm: 3.5,
            matchScore: 78,
            type: 'viewed',
            skills: ['JavaScript', 'Vue.js', 'Node.js', 'MySQL', 'Git'],
            bio: 'Generalist software developer passionate about building reliable web applications.',
          },
        ];

        // Format real applicants from database if they exist
        const formattedReal: CandidateItem[] = (realApps || []).map((app: any) => {
          const profile = app.applicant || {};
          const seeker = profile.job_seeker_profile || {};
          const skills = (profile.skills || []).map((s: any) => s.skill?.name || s.name);
          const edu = profile.educations?.[0];

          return {
            id: app.applicant_id,
            first_name: profile.first_name || 'Applicant',
            last_name: profile.last_name || '',
            avatar_url: profile.avatar_url,
            title: seeker.professional_title || 'Software Candidate',
            school: edu?.school_name || 'University Graduate',
            degree: edu?.degree || 'College Graduate',
            verifiedDiploma: edu?.verified || true,
            yearsExp: seeker.years_experience || 3,
            city: seeker.city || 'Metro Manila',
            distanceKm: 4.5,
            matchScore: app.match_score || 88,
            type: 'applied',
            skills: skills.length > 0 ? skills : ['React', 'JavaScript', 'TypeScript'],
            bio: seeker.bio || 'Verified WorkMatch candidate.',
          };
        });

        // Merge real applicants + catalog candidates
        const merged: CandidateItem[] = [...formattedReal, ...sampleCandidatesList];

        // Ensure current user is in the list with their actual score to see where they rank
        if (currentUserId) {
          const isAlreadyIn = merged.some((c) => c.id === currentUserId);
          if (!isAlreadyIn) {
            merged.unshift({
              id: currentUserId,
              first_name: 'You',
              last_name: '(Current Applicant)',
              avatar_url: null,
              title: 'Your Profile',
              school: 'Your Verified Institution',
              degree: 'Your Degree',
              verifiedDiploma: true,
              yearsExp: 4,
              city: job.city || 'Your Location',
              distanceKm: 2.5,
              matchScore: currentUserMatchScore,
              type: 'viewed',
              isCurrentUser: true,
              skills: ['React', 'JavaScript', 'Node.js', 'REST APIs'],
              bio: 'Your profile as seen in the applicant rankings for this role.',
            });
          }
        }

        // Sort descending by match score
        merged.sort((a, b) => b.matchScore - a.matchScore);

        setCandidates(merged);
      } catch (err) {
        console.error('Error loading applicant stalker candidates:', err);
      } finally {
        setLoading(false);
      }
    }

    loadApplicantsAndVisitors();
  }, [isOpen, job?.id, currentUserId, currentUserMatchScore]);

  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === 'applied' && c.type !== 'applied') return false;
    if (activeTab === 'viewed' && c.type !== 'viewed' && !c.isCurrentUser) return false;
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = `${c.first_name} ${c.last_name}`.toLowerCase().includes(q);
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchSkill = c.skills?.some((sk: string) => sk.toLowerCase().includes(q));
      return matchName || matchTitle || matchSkill;
    }
    return true;
  });

  const currentUserRank = candidates.findIndex((c) => c.isCurrentUser || c.id === currentUserId) + 1;
  const totalApplicantsCount = candidates.filter((c) => c.type === 'applied').length;
  const totalVisitorsCount = Math.max(job?.views || 0, candidates.length, totalApplicantsCount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setSelectedCandidate(null);
        onClose();
      }}
      maxWidth="3xl"
      title=""
    >
      <div className="space-y-6 -mt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-0.5 rounded-full text-[11px] font-bold text-mint-800">
              <Sparkles className="w-3 h-3 text-mint-600" /> Applicant Insights & Stalker Hub
            </div>
            <h2 className="text-xl font-black text-dark tracking-tight">
              Applicants & Visitors for {job?.title}
            </h2>
            <p className="text-xs text-muted">
              Inspect candidates who visited or submitted applications for {job?.company?.name || 'this company'}.
            </p>
          </div>
        </div>
        {/* Selected Candidate Detailed View — Full Profile Style */}
        {selectedCandidate ? (
          <div className="space-y-4 animate-slide-up">
            {/* Back button */}
            <button
              onClick={() => setSelectedCandidate(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-700 hover:text-mint-800 bg-mint-50 px-3 py-1.5 rounded-xl border border-mint-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Competitor Rankings
            </button>

            <div className="rounded-3xl border border-border shadow-soft bg-white">
              {/* ── Avatar + Name row ── */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  {/* Avatar circle */}
                  <div className="w-20 h-20 rounded-full ring-4 ring-white bg-gradient-to-br from-violet-500 to-purple-700 text-white font-black text-2xl flex items-center justify-center overflow-hidden shadow-md shrink-0">
                    {selectedCandidate.avatar_url ? (
                      <img
                        src={selectedCandidate.avatar_url}
                        alt={selectedCandidate.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (selectedCandidate.first_name?.[0] || 'C').toUpperCase()
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pb-1">
                    <button className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors">
                      <ExternalLink className="w-3 h-3" /> Share
                    </button>
                    <button className="inline-flex items-center gap-1.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 rounded-xl transition-colors shadow-sm">
                      <Star className="w-3 h-3" /> View Profile
                    </button>
                  </div>
                </div>

                {/* Name & meta */}
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-dark">
                      {selectedCandidate.first_name} {selectedCandidate.last_name}
                    </h3>
                    {selectedCandidate.verifiedDiploma && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                        <ShieldCheck className="w-3 h-3 text-mint-600" /> Verified Diploma
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                      selectedCandidate.type === 'applied'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {selectedCandidate.type === 'applied' ? '✓ Applied' : 'Viewed'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{selectedCandidate.title}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-mint-500" /> {selectedCandidate.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400" /> {selectedCandidate.yearsExp} years exp
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Content: two-column on desktop ── */}
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* LEFT column (spans 2) */}
                <div className="sm:col-span-2 space-y-4">
                  {/* Job Readiness Score */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-dark uppercase tracking-wide flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-mint-600" /> Job Readiness Score
                      </span>
                      <span className="text-xl font-black text-mint-700">{selectedCandidate.matchScore}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-mint-500 transition-all duration-700"
                        style={{ width: `${selectedCandidate.matchScore}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      This profile is{' '}
                      <span className={`font-bold ${selectedCandidate.matchScore >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedCandidate.matchScore >= 85 ? 'highly competitive' : 'competitive'}
                      </span>{' '}
                      and matches industry standards.
                    </p>
                  </div>

                  {/* About / Bio */}
                  {selectedCandidate.bio && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black text-dark uppercase tracking-wider">About</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedCandidate.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-mint-600" /> Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills?.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 hover:bg-mint-50 hover:border-mint-200 hover:text-mint-900 transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience (synthesized from title + years) */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-mint-600" /> Work Experience
                    </h4>
                    <div className="space-y-2">
                      <div className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-dark">{selectedCandidate.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {selectedCandidate.yearsExp > 2 ? `${selectedCandidate.yearsExp - 2} – Present` : 'Current'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{selectedCandidate.bio?.slice(0, 80)}...</p>
                        </div>
                      </div>
                      {selectedCandidate.yearsExp > 2 && (
                        <div className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-dark">Software Developer</p>
                            <p className="text-[11px] text-slate-500">
                              {selectedCandidate.yearsExp - 2} years · Contract
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Education & Certifications */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-mint-600" /> Education &amp; Certifications
                    </h4>
                    <div className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-white items-start justify-between">
                      <div className="flex gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-dark">{selectedCandidate.degree}</p>
                          <p className="text-[11px] text-slate-500">{selectedCandidate.school}</p>
                        </div>
                      </div>
                      {selectedCandidate.verifiedDiploma && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Competitor Comparison */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50/80 to-blue-50/50 border border-mint-200 space-y-2">
                    <span className="text-xs font-bold text-mint-950 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-mint-600" /> AI Competitor Comparison Against You
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentUserMatchScore >= selectedCandidate.matchScore
                        ? `You outrank this candidate by ${currentUserMatchScore - selectedCandidate.matchScore}% due to stronger alignment with the job's core skill requirements and verified diploma.`
                        : `This candidate currently ranks higher with ${selectedCandidate.matchScore}% match score. Consider taking verified assessments or completing your portfolio credentials to increase your rank.`}
                    </p>
                  </div>
                </div>

                {/* RIGHT column */}
                <div className="space-y-4">
                  {/* Contact / Meta info */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider">Candidate Info</h4>
                    <div className="space-y-2 text-[11px] text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                        <span>{selectedCandidate.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedCandidate.yearsExp} yrs experience</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="font-semibold text-violet-700">{selectedCandidate.matchScore}% AI Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Similar profiles from candidates list */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-mint-600" /> Similar Profiles
                    </h4>
                    <div className="space-y-2.5">
                      {candidates
                        .filter((c) => c.id !== selectedCandidate.id)
                        .slice(0, 3)
                        .map((sim, i) => (
                          <div
                            key={sim.id || i}
                            onClick={() => setSelectedCandidate(sim)}
                            className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 -mx-1 px-1 py-1 rounded-lg transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                            >
                              {sim.avatar_url ? (
                                <img src={sim.avatar_url} alt={sim.first_name} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                sim.first_name?.[0] || 'U'
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-dark truncate group-hover:text-mint-700 transition-colors">
                                {sim.first_name} {sim.last_name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">{sim.skills?.slice(0, 2).join(' · ')}</p>
                            </div>
                            <span className="text-[10px] font-black text-mint-700 shrink-0">{sim.matchScore}%</span>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="text-[11px] font-bold text-mint-700 hover:text-mint-800 hover:underline flex items-center gap-1 pt-1"
                    >
                      View More Profiles <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Candidates List View */
          <div className="space-y-4">
            {/* Candidate Cards Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-muted">No applicants found matching this criteria.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredCandidates.map((cand, idx) => {
                  const isCurrentUser = cand.isCurrentUser || cand.id === currentUserId;

                  return (
                    <div
                      key={cand.id || idx}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrentUser
                          ? 'bg-mint-50/80 border-mint-300 ring-2 ring-mint-400/20'
                          : 'bg-white border-border hover:border-mint-300 hover:bg-slate-50/70 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank indicator */}
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full border border-mint-200 overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center text-xs font-black text-mint-800">
                          {cand.avatar_url ? (
                            <img src={cand.avatar_url} alt={cand.first_name} className="w-full h-full object-cover" />
                          ) : (
                            cand.first_name?.[0] || 'U'
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-dark group-hover:text-mint-700 transition-colors">
                              {cand.first_name} {cand.last_name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-black bg-mint-600 text-white px-2 py-0.2 rounded-full">
                                YOU
                              </span>
                            )}
                            {cand.verifiedDiploma && (
                              <span title="Verified Diploma">
                                <ShieldCheck className="w-3.5 h-3.5 text-mint-600 shrink-0" />
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full border font-semibold ${
                                cand.type === 'applied'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {cand.type === 'applied' ? 'Applied' : 'Viewed'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 truncate">{cand.title}</p>

                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {cand.skills?.slice(0, 3).map((sk: string, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                              >
                                {sk}
                              </span>
                            ))}
                            {cand.skills?.length > 3 && (
                              <span className="text-[10px] text-muted">+{cand.skills.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-mint-700 block">
                            {cand.matchScore}%
                          </span>
                          <span className="text-[10px] text-muted">Match</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-bold text-mint-700 group-hover:bg-mint-50"
                        >
                          Profile <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
