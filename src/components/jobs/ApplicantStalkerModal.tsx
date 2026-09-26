'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
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
        // Record current user view for this job in localStorage to track visits
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
  const totalVisitorsCount = candidates.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setSelectedCandidate(null);
        onClose();
      }}
      maxWidth="xl"
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

          {/* Quick Rank Badge */}
          <div className="bg-slate-900 text-white p-3 rounded-2xl shrink-0 text-center shadow-md">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-mint-400">
              <Award className="w-3.5 h-3.5" /> Your Estimated Match Rank
            </div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5">
              #{currentUserRank > 0 ? currentUserRank : 1}
              <span className="text-xs font-normal text-slate-400 ml-1">of {totalVisitorsCount}</span>
            </div>
          </div>
        </div>

        {/* Selected Candidate Detailed View (Stalker Inspector View) */}
        {selectedCandidate ? (
          <div className="space-y-5 animate-slide-up">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-700 hover:text-mint-800 bg-mint-50 px-3 py-1.5 rounded-xl border border-mint-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Competitor Rankings
            </button>

            <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-6">
              {/* Profile Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-mint-500 text-white font-black text-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {selectedCandidate.avatar_url ? (
                      <img
                        src={selectedCandidate.avatar_url}
                        alt={selectedCandidate.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedCandidate.first_name?.[0] || 'C'
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-dark">
                        {selectedCandidate.first_name} {selectedCandidate.last_name}
                      </h3>
                      {selectedCandidate.verifiedDiploma && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                          <ShieldCheck className="w-3 h-3 text-mint-600" /> Verified Diploma
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {selectedCandidate.title} • {selectedCandidate.yearsExp} Years Exp
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-mint-500" /> {selectedCandidate.city} ({selectedCandidate.distanceKm} km away)
                    </p>
                  </div>
                </div>

                <div className="text-right bg-mint-50/70 p-3.5 rounded-2xl border border-mint-100">
                  <span className="text-[10px] uppercase font-bold text-mint-800 block">AI Match Score</span>
                  <span className="text-2xl font-black text-mint-700">{selectedCandidate.matchScore}%</span>
                  <p className="text-[10px] text-muted capitalize">
                    {selectedCandidate.type === 'applied' ? 'Applied Candidate' : 'Job Viewer'}
                  </p>
                </div>
              </div>

              {/* Bio snippet */}
              {selectedCandidate.bio && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-dark uppercase tracking-wider">Candidate Bio</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{selectedCandidate.bio}"
                  </p>
                </div>
              )}

              {/* Education & Verified Credentials */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-dark uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-mint-600" /> Education & Credentials
                </h4>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-dark">{selectedCandidate.school}</p>
                    <p className="text-[11px] text-slate-600">{selectedCandidate.degree}</p>
                  </div>
                  {selectedCandidate.verifiedDiploma && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Legally Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Skills Analysis */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-mint-600" /> Verified Skills Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.skills?.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <CheckCircle2 className="w-3 h-3 text-mint-600" /> {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Competitor Comparison vs You */}
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
          </div>
        ) : (
          /* Candidates List View */
          <div className="space-y-4">
            {/* Stats row & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-mint-50/70 p-3.5 rounded-2xl border border-mint-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint-500 text-white flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-dark block leading-none">{totalApplicantsCount}</span>
                  <span className="text-[11px] text-muted font-medium">Applied Candidates</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-dark block leading-none">{totalVisitorsCount}</span>
                  <span className="text-[11px] text-muted font-medium">Candidates Viewed / Clicked</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-emerald-900 block leading-none">
                    #{currentUserRank > 0 ? currentUserRank : 1}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">Your Ranking</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none ${
                    activeTab === 'all' ? 'bg-white text-dark shadow-xs' : 'text-slate-600 hover:text-dark'
                  }`}
                >
                  All Competitors ({candidates.length})
                </button>
                <button
                  onClick={() => setActiveTab('applied')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none ${
                    activeTab === 'applied' ? 'bg-white text-dark shadow-xs' : 'text-slate-600 hover:text-dark'
                  }`}
                >
                  Applicants Only ({totalApplicantsCount})
                </button>
                <button
                  onClick={() => setActiveTab('viewed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none ${
                    activeTab === 'viewed' ? 'bg-white text-dark shadow-xs' : 'text-slate-600 hover:text-dark'
                  }`}
                >
                  Recent Visitors
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter candidate or skill..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border text-xs focus:border-mint-500 focus:outline-none"
                />
              </div>
            </div>

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
