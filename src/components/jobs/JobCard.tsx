'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Company } from '@/types/database';
import { MatchResult } from '@/types/matching';
import { MatchScoreGauge } from '../matching/MatchScoreGauge';
import { Button } from '../ui/Button';
import { formatSalaryRange, formatDistance, formatRelativeTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import {
  MapPin,
  Building2,
  Bookmark,
  BookmarkCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
  Sparkles,
} from 'lucide-react';

interface JobCardProps {
  job: Job & { match?: MatchResult; company?: Company };
  onApplyClick?: (job: Job) => void;
  showApplyButton?: boolean;
  isSavedInitial?: boolean;
  onSavedChange?: (jobId: string, isSaved: boolean) => void;
}

export function JobCard({
  job,
  onApplyClick,
  showApplyButton = true,
  isSavedInitial = false,
  onSavedChange,
}: JobCardProps) {
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isSavedInitial);
  }, [isSavedInitial]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        if (!isSavedInitial) {
          supabase
            .from('saved_jobs')
            .select('id')
            .eq('user_id', user.id)
            .eq('job_id', job.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setIsSaved(true);
            });
        }
      }
    });
  }, [job.id, isSavedInitial]);

  const handleToggleSave = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign('/auth/seeker/sign-in');
      return;
    }

    if (isSaved) {
      await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', job.id);
      setIsSaved(false);
      if (onSavedChange) onSavedChange(job.id, false);
    } else {
      await supabase.from('saved_jobs').upsert(
        { user_id: user.id, job_id: job.id },
        { onConflict: 'user_id,job_id' }
      );
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

  const skillsList = job.required_skills || (job as any).job_skills || [];

  return (
    <>
      <div className="group rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-soft card-interactive relative flex flex-col justify-between hover:border-mint-200 transition-all">
        <div className="space-y-4">
          {/* Top bar: Company logo + Title + Score gauge + Save button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                {job.company?.logo_url ? (
                  <img
                    src={job.company.logo_url}
                    alt={job.company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/companies/${job.company_id}`}
                  className="text-xs font-semibold text-muted hover:text-mint-600 transition-colors flex items-center gap-1 truncate"
                >
                  {job.company?.name || 'Company'}
                  {job.company?.verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                  )}
                </Link>
                <h3
                  onClick={() => setIsDetailsOpen(true)}
                  className="text-base font-bold text-dark group-hover:text-mint-600 transition-colors line-clamp-1 cursor-pointer"
                >
                  {job.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {job.match && (
                <div title={`${job.match.overallScore}% Profile Match`}>
                  <MatchScoreGauge score={job.match.overallScore} size="md" />
                </div>
              )}
              <button
                onClick={handleToggleSave}
                className={`p-2 rounded-xl border transition-colors ${
                  isSaved
                    ? 'bg-mint-50 border-mint-200 text-mint-600'
                    : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
                aria-label={isSaved ? 'Remove from Saved' : 'Save Job'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-mint-600" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Location, Work arrangement, Experience, Salary */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-muted">
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-mint-500" />
              {job.city || 'Remote'}
              {job.match?.distanceKm !== undefined && (
                <span className="text-mint-700 font-semibold ml-1">
                  ({formatDistance(job.match.distanceKm)})
                </span>
              )}
            </span>

            <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />

            <span className="font-black text-dark">
              {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
            </span>

            <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />

            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
              {job.work_arrangement}
            </span>

            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
              {job.experience_level}
            </span>
          </div>

          {/* Required skills badges */}
          {skillsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skillsList.slice(0, 3).map((skill: any, i: number) => (
                <span
                  key={skill.id || i}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-mint-50/80 text-mint-800 border border-mint-100"
                >
                  {skill.name || skill.skill?.name || 'Skill'}
                </span>
              ))}
              {skillsList.length > 3 && (
                <span className="text-[11px] text-muted font-medium px-1.5 py-0.5">
                  +{skillsList.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatRelativeTime(job.created_at)}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailsOpen(true)}
              className="text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5" /> View Details
            </Button>

            {showApplyButton && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenApply(job)}
                className="text-xs font-bold shadow-sm"
              >
                Apply Now <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
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
      />
    </>
  );
}
