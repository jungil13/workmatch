import { supabase } from '@/lib/supabase/client';

export interface ApplicantPreview {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials: string;
  matchScore: number;
}

export interface JobEngagementStats {
  views: number;
  applicantsCount: number;
  estimatedRank: number;
  recentApplicants: ApplicantPreview[];
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
 * - Real applicants count from applications table
 * - Top applicant avatars/initials
 * - Real calculated rank based on applicant scores
 */
export async function fetchJobEngagementStats(
  jobId: string,
  initialViews: number = 0,
  candidateMatchScore: number = 90
): Promise<JobEngagementStats> {
  if (!jobId) {
    return {
      views: initialViews,
      applicantsCount: 0,
      estimatedRank: 1,
      recentApplicants: [],
    };
  }

  try {
    // Run parallel queries: fetch applications and current job views
    const [appsRes, jobRes] = await Promise.all([
      supabase
        .from('applications')
        .select(`
          id,
          applicant_id,
          match_score,
          applicant:profiles(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('job_id', jobId),
      supabase
        .from('jobs')
        .select('views')
        .eq('id', jobId)
        .maybeSingle(),
    ]);

    const apps = appsRes.data || [];
    const applicantsCount = appsRes.count ?? apps.length;

    // View count from database or initial fallback
    const dbViews = typeof jobRes.data?.views === 'number' ? jobRes.data.views : initialViews;
    // Views should at least equal applicants (since one must visit to apply)
    const totalViews = Math.max(dbViews, applicantsCount);

    // Calculate real rank based on actual applicants' match scores
    const applicantScores = apps.map((a: any) => Number(a.match_score) || 75);
    const higherScoresCount = applicantScores.filter((score) => score > candidateMatchScore).length;
    const estimatedRank = higherScoresCount + 1;

    // Extract recent applicant previews with avatars or initials
    const recentApplicants: ApplicantPreview[] = apps.slice(0, 3).map((a: any) => {
      const profile = a.applicant || {};
      const fName = profile.first_name || '';
      const lName = profile.last_name || '';
      const fullName = `${fName} ${lName}`.trim() || 'Applicant';
      const initials = (fName[0] || 'C') + (lName[0] || '');

      return {
        id: a.applicant_id || a.id,
        name: fullName,
        avatarUrl: profile.avatar_url || null,
        initials: initials.toUpperCase(),
        matchScore: Number(a.match_score) || 80,
      };
    });

    return {
      views: totalViews,
      applicantsCount,
      estimatedRank,
      recentApplicants,
    };
  } catch (err) {
    console.error('Error fetching job engagement stats:', err);
    return {
      views: initialViews,
      applicantsCount: 0,
      estimatedRank: 1,
      recentApplicants: [],
    };
  }
}
