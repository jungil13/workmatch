import { supabase } from '@/lib/supabase/client';

export interface JobEngagementStats {
  views: number;
  applicantsCount: number | null;
}

export async function fetchJobApplicantCounts(jobIds: string[]): Promise<Record<string, number>> {
  const uniqueJobIds = [...new Set(jobIds)].filter(Boolean);
  if (uniqueJobIds.length === 0) return {};

  const counts: Record<string, number> = {};
  for (let i = 0; i < uniqueJobIds.length; i += 20) {
    const response = await fetch('/api/jobs/applicant-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds: uniqueJobIds.slice(i, i + 20) }),
    });
    const result = await response.json();
    if (
      !response.ok ||
      !result.counts ||
      typeof result.counts !== 'object' ||
      Array.isArray(result.counts)
    ) {
      throw new Error(result.error || 'Could not load applicant counts.');
    }
    Object.assign(
      counts,
      Object.fromEntries(Object.entries(result.counts).map(([jobId, count]) => [jobId, Number(count)]))
    );
  }
  return counts;
}

/**
 * Tracks a user click or visit to a job.
 * Updates Supabase database via atomic RPC (or direct fallback update)
 * and records in job_views activity table.
 */
export async function trackJobInteraction(
  jobId: string,
  options: {
    userId?: string | null;
    source?: 'card_click' | 'view_details' | 'apply_click' | 'stalker_view' | 'page_view';
  } = {}
): Promise<number | null> {
  if (!jobId) return null;

  const { userId = null, source = 'card_click' } = options;

  try {
    let updatedViews: number | null = null;

    // 1. Try atomic RPC first
    const { data: rpcViews, error: rpcError } = await supabase.rpc('increment_job_view', {
      job_id: jobId,
    });

    if (!rpcError && typeof rpcViews === 'number') {
      updatedViews = rpcViews;
    } else {
      // Fallback: Direct database update
      const { data: jobData } = await supabase
        .from('jobs')
        .select('views')
        .eq('id', jobId)
        .maybeSingle();

      const currentViews = jobData?.views ?? 0;
      const nextViews = currentViews + 1;

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ views: nextViews })
        .eq('id', jobId);

      if (!updateError) {
        updatedViews = nextViews;
      }
    }

    // 2. Insert into job_views log if available
    try {
      await supabase.from('job_views').insert({
        job_id: jobId,
        viewer_id: userId || null,
        source,
      });
    } catch {
      // Silently catch if job_views table is not yet created
    }

    // 3. Update localStorage session cache
    if (typeof window !== 'undefined') {
      try {
        const key = `wm_job_views_${jobId}`;
        const currentLocal = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, String(Math.max(currentLocal + 1, updatedViews ?? 1)));

        // Notify other components on this window
        window.dispatchEvent(
          new CustomEvent('workmatch:job-view-updated', {
            detail: { jobId, views: updatedViews },
          })
        );
      } catch {
        // LocalStorage may fail in private mode
      }
    }

    return updatedViews;
  } catch (err) {
    console.error('Error tracking job interaction:', err);
    return null;
  }
}

/**
 * Fetches real live engagement statistics for a job:
 * - Real views/visits count from jobs table
 * - Real applicant count from the server-side aggregate endpoint
 */
export async function fetchJobEngagementStats(
  jobId: string,
  initialViews: number = 0
): Promise<JobEngagementStats> {
  if (!jobId) {
    return {
      views: initialViews,
      applicantsCount: 0,
    };
  }

  const [jobRes, counts] = await Promise.all([
    supabase.from('jobs').select('views').eq('id', jobId).maybeSingle(),
    fetchJobApplicantCounts([jobId]),
  ]);

  if (jobRes.error) throw new Error(`Could not load job views: ${jobRes.error.message}`);

  const applicantsCount = counts[jobId] ?? 0;
  const dbViews = typeof jobRes.data?.views === 'number' ? jobRes.data.views : initialViews;

  return {
    views: dbViews,
    applicantsCount,
  };
}
