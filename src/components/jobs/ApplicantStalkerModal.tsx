'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  Users,
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
  matchScore: number;
  type: string;
  skills: string[];
  bio: string;
}

interface ApplicantStalkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export function ApplicantStalkerModal({ isOpen, onClose, job }: ApplicantStalkerModalProps) {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !job?.id) return;

    async function loadApplicantsAndVisitors() {
      setLoading(true);
      setLoadError('');
      setCandidates([]);
      setSelectedCandidate(null);

      try {
        // Only people who actually applied are shown; aggregate job views do not identify visitors.
        const { data: realApps, error } = await supabase
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
        if (error) throw new Error(error.message);

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
            title: seeker.professional_title || 'Not provided',
            school: edu?.school_name || 'Not provided',
            degree: edu?.degree || 'Not provided',
            verifiedDiploma: Boolean(edu?.verified),
            yearsExp: Number(seeker.years_experience || 0),
            city: seeker.city || 'Not provided',
            matchScore: app.match_score ?? 0,
            type: 'applied',
            skills,
            bio: seeker.bio || '',
          };
        });

        // Sort descending by match score
        formattedReal.sort((a, b) => b.matchScore - a.matchScore);

        setCandidates(formattedReal);
      } catch (err) {
        console.error('Error loading applicant stalker candidates:', err);
        setLoadError(err instanceof Error ? err.message : 'Could not load applicants.');
      } finally {
        setLoading(false);
      }
    }

    loadApplicantsAndVisitors();
  }, [isOpen, job?.id]);

  const filteredCandidates = candidates.filter((c) => {
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = `${c.first_name} ${c.last_name}`.toLowerCase().includes(q);
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchSkill = c.skills?.some((sk: string) => sk.toLowerCase().includes(q));
      return matchName || matchTitle || matchSkill;
    }
    return true;
  });

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
              <Sparkles className="w-3 h-3 text-mint-600" /> Applicant Insights
            </div>
            <h2 className="text-xl font-black text-dark tracking-tight">
              Applicants for {job?.title} ({candidates.length})
            </h2>
            <p className="text-xs text-muted">
              {candidates.length} {candidates.length === 1 ? 'person has' : 'people have'} applied for this job at{' '}
              {job?.company?.name || 'this company'}.
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
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Applicants
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                      ✓ Applied
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

                  {/* Employment history is not available from the application record. */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-dark uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-mint-600" /> Work Experience
                    </h4>
                    <p className="text-xs text-slate-600">
                      {selectedCandidate.yearsExp > 0
                        ? `${selectedCandidate.yearsExp} years reported in profile`
                        : 'No work experience details provided.'}
                    </p>
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

                  {candidates.length > 1 && (
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
                    </div>
                  )}
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
            ) : loadError ? (
              <div className="text-center py-10 space-y-2 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-xs font-semibold text-rose-700">Could not load applicants.</p>
                <p className="text-xs text-rose-600">{loadError}</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-muted">No applicants found matching this criteria.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredCandidates.map((cand, idx) => {
                  return (
                    <div
                      key={cand.id || idx}
                      onClick={() => setSelectedCandidate(cand)}
                      className="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group bg-white border-border hover:border-mint-300 hover:bg-slate-50/70 shadow-xs"
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
                            {cand.verifiedDiploma && (
                              <span title="Verified Diploma">
                                <ShieldCheck className="w-3.5 h-3.5 text-mint-600 shrink-0" />
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.2 rounded-full border font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                              Applied
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
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedCandidate(cand);
                          }}
                          className="text-xs font-bold text-mint-700 group-hover:bg-mint-50"
                        >
                          View Profile <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
