'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MatchScoreGauge } from '@/components/matching/MatchScoreGauge';
import { formatSalaryRange, formatRelativeTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { Job, Company } from '@/types/database';
import { MatchResult } from '@/types/matching';
import {
  Building2,
  MapPin,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

interface JobDetailsModalProps {
  job: (Job & { company?: Company; match?: MatchResult }) | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyClick: (job: Job) => void;
  isSaved?: boolean;
  onToggleSave?: (jobId: string) => void;
}

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onApplyClick,
  isSaved = false,
  onToggleSave,
}: JobDetailsModalProps) {
  if (!job) return null;

  const skillsList = job.required_skills || (job as any).job_skills || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description=""
      className="max-w-3xl"
    >
      <div className="space-y-6 -mt-3">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {job.company?.logo_url ? (
                <img
                  src={job.company.logo_url}
                  alt={job.company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div>
              <Link
                href={`/companies/${job.company_id}`}
                className="text-xs font-bold text-mint-700 hover:underline flex items-center gap-1"
              >
                {job.company?.name || 'Company'}
                {job.company?.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-mint-600" />
                )}
              </Link>
              <h2 className="text-xl sm:text-2xl font-black text-dark tracking-tight mt-0.5">
                {job.title}
              </h2>
              <p className="text-xs text-muted flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city || 'Remote'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Posted {formatRelativeTime(job.created_at)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            {job.match && (
              <MatchScoreGauge score={job.match.overallScore} size="md" />
            )}
            {onToggleSave && (
              <button
                onClick={() => onToggleSave(job.id)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isSaved
                    ? 'bg-mint-50 border-mint-200 text-mint-600'
                    : 'border-border text-slate-400 hover:text-dark hover:bg-slate-50'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-5 h-5 text-mint-600" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Highlight Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[11px] font-semibold text-muted">Monthly Salary</p>
            <p className="text-xs font-black text-mint-800 mt-0.5">
              {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[11px] font-semibold text-muted">Work Setup</p>
            <p className="text-xs font-bold text-dark mt-0.5">{job.work_arrangement}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[11px] font-semibold text-muted">Job Type</p>
            <p className="text-xs font-bold text-dark mt-0.5">{job.employment_type}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[11px] font-semibold text-muted">Experience</p>
            <p className="text-xs font-bold text-dark mt-0.5">{job.experience_level}</p>
          </div>
        </div>

        {/* Why You Match Insights (if present) */}
        {job.match && (
          <div className="bg-mint-50/70 border border-mint-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mint-900">
              <Sparkles className="w-4 h-4 text-mint-600" />
              AI Match Breakdown ({job.match.overallScore}% Fit)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-mint-950">
              {job.match.factors && Object.values(job.match.factors).map((factor: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${factor.positive ? 'bg-mint-600' : 'bg-amber-500'}`} />
                  <span className="font-semibold">{factor.name}:</span>
                  <span className="text-slate-600">{factor.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Required Skills Badges */}
        {skillsList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-dark uppercase tracking-wider">
              Required Skills & Competencies
            </h4>
            <div className="flex flex-wrap gap-2">
              {skillsList.map((sk: any, i: number) => {
                const skillName = sk.name || sk.skill?.name || 'Skill';
                const minProf = sk.minimum_proficiency || 3;
                return (
                  <span
                    key={sk.id || i}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-mint-50 text-mint-900 border border-mint-200 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-mint-600" />
                    {skillName} <span className="text-[10px] text-mint-700 opacity-80">(Lvl {minProf}/5)</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Job Overview */}
        {job.description && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-dark uppercase tracking-wider">
              Job Description
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-2xl border border-border p-4">
              {job.description}
            </div>
          </div>
        )}

        {/* Responsibilities */}
        {job.responsibilities && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-dark uppercase tracking-wider">
              Key Responsibilities
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-2xl border border-border p-4">
              {job.responsibilities}
            </div>
          </div>
        )}

        {/* Qualifications */}
        {job.qualifications && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-dark uppercase tracking-wider">
              Qualifications & Experience
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-2xl border border-border p-4">
              {job.qualifications}
            </div>
          </div>
        )}

        {/* Company Box */}
        {job.company && (
          <div className="p-4 rounded-2xl border border-border bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-dark">{job.company.name}</h5>
              <p className="text-[11px] text-muted">{job.company.industry} • {job.company.city}, {job.company.province}</p>
            </div>
            <Link
              href={`/companies/${job.company_id}`}
              className="text-xs font-bold text-mint-700 hover:underline flex items-center gap-1 shrink-0"
            >
              Company Profile <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href={`/jobs/${job.id}`} className="text-xs font-semibold text-muted hover:text-dark flex items-center gap-1">
            Open dedicated page <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onClose();
                onApplyClick(job);
              }}
              className="w-full sm:w-auto font-bold shadow-sm"
            >
              Apply with Resume
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
