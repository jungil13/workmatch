'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Company } from '@/types/database';
import { MatchResult } from '@/types/matching';
import { Button } from '../ui/Button';
import { formatSalaryRange, formatDistance } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { ApplicantStalkerModal } from '@/components/jobs/ApplicantStalkerModal';
import {
  MapPin,
  Bookmark,
  BookmarkCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Target,
  Bot,
  Users,
} from 'lucide-react';

interface JobCardProps {
  job: Job & { match?: MatchResult; company?: Company };
  onApplyClick?: (job: Job) => void;
  showApplyButton?: boolean;
  isSavedInitial?: boolean;
  onSavedChange?: (jobId: string, isSaved: boolean) => void;
  /** Pass candidate skills so the card can show matched/preferred tags */
  candidateSkillNames?: string[];
}

export function JobCard({
  job,
  onApplyClick,
  showApplyButton = true,
  isSavedInitial = false,
  onSavedChange,
  candidateSkillNames = [],
}: JobCardProps) {
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [isApplied, setIsApplied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [stalkerOpen, setStalkerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isSavedInitial);
  }, [isSavedInitial]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      // Check saved status
      if (!isSavedInitial) {
        supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('job_id', job.id)
          .maybeSingle()
          .then(({ data }) => { if (data) setIsSaved(true); });
      }

      // Check applied status
      supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', user.id)
        .eq('job_id', job.id)
        .maybeSingle()
        .then(({ data }) => { if (data) setIsApplied(true); });
    });
  }, [job.id, isSavedInitial]);

  const handleToggleSave = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign('/auth/sign-in');
      return;
    }
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', job.id);
      setIsSaved(false);
      if (onSavedChange) onSavedChange(job.id, false);
    } else {
      await supabase.from('saved_jobs').upsert({ user_id: user.id, job_id: job.id }, { onConflict: 'user_id,job_id' });
      setIsSaved(true);
      if (onSavedChange) onSavedChange(job.id, true);
    }
  };

  const handleOpenApply = (jobToApply: Job) => {
    if (onApplyClick) {
      onApplyClick(jobToApply);
    } else {
      setIsApplyOpen(true);
    }
  };

  const getCompanyInitials = (name?: string) => {
    if (!name) return 'WM';
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  };

  const skillsList = job.required_skills || (job as any).job_skills || [];

  const matchedSkills = skillsList.filter((sk: any) =>
    candidateSkillNames.includes((sk.name || sk.skill?.name || '').toLowerCase())
  );

  const preferredSkills = skillsList.filter((sk: any) =>
    !candidateSkillNames.includes((sk.name || sk.skill?.name || '').toLowerCase())
  );

  const totalApplicants = 30;
  const totalVisitors = 50;

  return (
    <>
      <div className="bg-white rounded-3xl border border-border p-5 sm:p-6 shadow-soft hover:border-mint-300 transition-all space-y-4 group flex flex-col">

        {/* Job Header: Logo + Title + Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Company Logo or Initials Badge */}
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
              ) : (
                getCompanyInitials(job.company?.name)
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <h3
                onClick={() => setIsDetailsOpen(true)}
                className="text-base font-black text-dark group-hover:text-mint-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
              >
                {job.title}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                <Link
                  href={`/companies/${job.company_id}`}
                  className="font-bold hover:text-mint-600 transition-colors inline-flex items-center gap-1"
                >
                  {job.company?.name || 'Company'}
                </Link>
                <span>•</span>
                <span>{job.city || 'Remote'}</span>
                {job.company?.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                )}
              </div>

              {/* Badge Pill Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {job.match?.distanceKm !== undefined ? formatDistance(job.match.distanceKm) : job.city || 'Remote'}
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {job.employment_type} • {job.work_arrangement}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleToggleSave}
            className={`p-2.5 rounded-xl border transition-colors shrink-0 self-start ${
              isSaved
                ? 'bg-mint-50 border-mint-200 text-mint-600'
                : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save Job'}
            aria-label={isSaved ? 'Remove from Saved' : 'Save Job'}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-mint-600" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* AI Referral Box */}
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
            <Bot className="w-4 h-4 text-emerald-700" /> Why WorkMatch AI Referred This
          </div>
          <p className="text-xs text-emerald-950 leading-relaxed font-medium">
            We referred this role because your verified{' '}
            <strong className="font-black text-emerald-900">
              {matchedSkills.length > 0
                ? matchedSkills.slice(0, 2).map((s: any) => s.name || s.skill?.name).join(' and ')
                : skillsList.slice(0, 2).map((s: any) => s.name || s.skill?.name || 'skills').join(' and ') || 'skills'}
            </strong>{' '}
            skills are a strong match for this position's requirements.
          </p>
        </div>

        {/* Skills Analysis Tag Pills */}
        {skillsList.length > 0 && (
          <div className="space-y-1.5 flex-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Skills Analysis
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {skillsList.slice(0, 5).map((sk: any, i: number) => {
                const name = sk.name || sk.skill?.name || 'Skill';
                const isMatched = candidateSkillNames.includes(name.toLowerCase());
                return (
                  <span
                    key={sk.id || i}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl border ${
                      isMatched
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    {isMatched ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {name}{isMatched ? '' : ' (preferred)'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Applicant Stalker Bar — Clickable */}
        <div
          onClick={() => setStalkerOpen(true)}
          className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-2xl transition-all group/stalker"
        >
          <div className="flex items-center gap-3">
            {/* Overlapping Avatar Circles */}
            <div className="flex -space-x-2 overflow-hidden items-center">
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">ML</div>
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">AS</div>
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">JC</div>
            </div>
            <div className="text-xs text-slate-700">
              <strong className="text-dark font-bold">{totalApplicants} / {totalVisitors} applicants</strong>{' '}
              • You&apos;d rank{' '}
              <strong className="text-emerald-700 font-black">#1</strong> by match score
            </div>
          </div>
          <span className="text-xs font-bold text-mint-700 group-hover/stalker:underline flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5" /> See Profiles →
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDetailsOpen(true)}
            className="text-xs font-semibold flex-1 justify-center"
          >
            View Details
          </Button>

          {showApplyButton && (
            <Button
              variant={isApplied ? 'outline' : 'primary'}
              size="sm"
              onClick={() => { if (!isApplied) handleOpenApply(job); }}
              disabled={isApplied}
              className="text-xs font-bold shadow-sm flex-1 justify-center"
            >
              {isApplied ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Applied</>
              ) : (
                <>Apply Now <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      <JobDetailsModal
        job={job}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onApplyClick={handleOpenApply}
        isSaved={isSaved}
        onToggleSave={() => handleToggleSave()}
      />

      {/* Apply with Resume Modal */}
      <ApplyModal
        job={job}
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        matchScore={job.match?.overallScore || 0}
        onSuccess={() => setIsApplied(true)}
      />

      {/* Applicant Stalker Modal */}
      <ApplicantStalkerModal
        isOpen={stalkerOpen}
        onClose={() => setStalkerOpen(false)}
        job={job}
        currentUserId={currentUserId || undefined}
        currentUserMatchScore={job.match?.overallScore || 92}
      />
    </>
  );
}
