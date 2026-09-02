'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ApplyModal } from '@/components/applications/ApplyModal';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { supabase } from '@/lib/supabase/client';
import { Briefcase, Building2, MapPin, BookmarkCheck, Trash2, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { formatSalaryRange } from '@/lib/utils';

export default function SeekerSavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  async function fetchSavedJobs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('saved_jobs')
      .select('*, job:jobs(*, company:companies(*), required_skills:job_skills(*, skill:skills(*)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setSavedJobs(data ?? []);
    setLoading(false);
  }

  const handleUnsave = async (savedJobId: string) => {
    await supabase.from('saved_jobs').delete().eq('id', savedJobId);
    setSavedJobs((prev) => prev.filter((s) => s.id !== savedJobId));
    if (selectedJobForDetails && selectedJobForDetails.id === savedJobId) {
      setSelectedJobForDetails(null);
    }
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Saved Jobs"
      subtitle="Jobs you've bookmarked for later review."
      actions={
        <Link href="/seeker/find-jobs">
          <Button variant="primary" size="sm">
            <Sparkles className="w-4 h-4" /> Browse More Jobs
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No saved jobs yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Bookmark jobs while browsing the job feed or recommendations to review and apply to them here anytime.
            </p>
            <div className="pt-2">
              <Link href="/seeker/find-jobs">
                <Button variant="primary" size="sm">
                  Browse Open Jobs
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {savedJobs.map((saved: any) => {
              const job = saved.job;
              if (!job) return null;

              return (
                <div
                  key={saved.id}
                  className="bg-white rounded-3xl border border-border p-6 shadow-soft hover:border-mint-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200">
                        {job.employment_type} • {job.work_arrangement}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-mint-500" /> {job.city || 'Remote'}
                      </span>
                    </div>

                    <div>
                      <h3
                        onClick={() => setSelectedJobForDetails(job)}
                        className="text-base font-bold text-dark hover:text-mint-600 transition-colors cursor-pointer"
                      >
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-semibold">
                        {job.company?.name || 'Company'}
                      </p>
                    </div>

                    <p className="text-xs font-black text-mint-800">
                      {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobForDetails(job)}
                      className="text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedJobForApply(job)}
                      className="text-xs font-bold shadow-sm"
                    >
                      Apply Now <ArrowRight className="w-3.5 h-3.5" />
                    </Button>

                    <button
                      onClick={() => handleUnsave(saved.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                      title="Remove from saved jobs"
                      aria-label="Remove from saved jobs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          isOpen={!!selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onApplyClick={(jobToApply) => {
            setSelectedJobForDetails(null);
            setSelectedJobForApply(jobToApply);
          }}
          isSaved={true}
          onToggleSave={async () => {
            const savedItem = savedJobs.find((s) => s.job_id === selectedJobForDetails.id);
            if (savedItem) {
              await handleUnsave(savedItem.id);
              setSelectedJobForDetails(null);
            }
          }}
        />
      )}

      {/* Apply Modal */}
      {selectedJobForApply && (
        <ApplyModal
          job={selectedJobForApply}
          isOpen={!!selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          onSuccess={() => {
            fetchSavedJobs();
          }}
        />
      )}
    </DashboardLayout>
  );
}
